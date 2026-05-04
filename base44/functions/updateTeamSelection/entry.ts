import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Secure backend function for TeamSelection create / update / delete.
 * Requires the caller to be an approved club selector or admin.
 * 
 * Actions:
 *   create — create a new TeamSelection record
 *   update — update an existing TeamSelection record
 *   delete — delete a TeamSelection record (admin only)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, clubId, selectionId, data } = await req.json();

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    // Verify the caller is an approved selector or admin for this club
    const isPlatformAdmin = user.role === 'admin';
    let callerMembership = null;
    if (!isPlatformAdmin) {
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
        status: 'approved',
      });
      callerMembership = memberships[0];
      const isSelector = callerMembership?.role === 'selector' || callerMembership?.role === 'admin';
      if (!isSelector) {
        return Response.json({ error: 'Forbidden: must be a club selector or admin' }, { status: 403 });
      }
    }

    if (action === 'create') {
      if (!data) return Response.json({ error: 'Missing data for create' }, { status: 400 });
      const created = await base44.asServiceRole.entities.TeamSelection.create({
        ...data,
        club_id: clubId,
      });
      return Response.json({ success: true, id: created.id, record: created });
    }

    if (action === 'update') {
      if (!selectionId || !data) return Response.json({ error: 'Missing selectionId or data for update' }, { status: 400 });
      // Verify record belongs to this club
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.update(selectionId, data);
      return Response.json({ success: true });
    }

    if (action === 'delete') {
      if (!selectionId) return Response.json({ error: 'Missing selectionId for delete' }, { status: 400 });
      // Delete requires admin role (not just selector)
      const isAdmin = isPlatformAdmin || callerMembership?.role === 'admin';
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden: only club admins can delete selections' }, { status: 403 });
      }
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