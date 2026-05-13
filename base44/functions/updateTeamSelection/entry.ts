import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Auth helpers (inlined — no local imports in Deno Deploy)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

// ---------------------------------------------------------------------------

/**
 * Secure backend function for TeamSelection create / update / delete.
 * 
 * Authorization model:
 *   create / update — club admin OR club selector (ClubMembership.role)
 *   delete          — club admin only
 *   publish         — club admin or selector
 * 
 * NOTE: RLS on TeamSelection uses user_condition role checks which only look at
 * the global Users.role. This function bypasses that via asServiceRole after
 * verifying the correct ClubMembership.role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, clubId, selectionId, data } = await req.json();

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    const platform = isPlatformAdmin(user);
    const membership = platform ? null : await getClubMembership(base44, user.email, clubId);
    const memberRole = membership?.role;

    const isAdminLevel = platform || memberRole === 'admin';
    const isSelectorLevel = isAdminLevel || memberRole === 'selector';

    if (action === 'create') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!data) return Response.json({ error: 'Missing data for create' }, { status: 400 });
      const created = await base44.asServiceRole.entities.TeamSelection.create({ ...data, club_id: clubId });
      return Response.json({ success: true, id: created.id, record: created });
    }

    if (action === 'update') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!selectionId || !data) return Response.json({ error: 'Missing selectionId or data' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.update(selectionId, data);
      return Response.json({ success: true });
    }

    if (action === 'delete') {
      if (!isAdminLevel) {
        return Response.json({ error: 'Forbidden: only club admins can delete selections' }, { status: 403 });
      }
      if (!selectionId) return Response.json({ error: 'Missing selectionId' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.delete(selectionId);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('updateTeamSelection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});