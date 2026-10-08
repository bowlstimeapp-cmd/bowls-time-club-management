import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Selection Audit Log reader.
//
// Returns selection audit entries for a club. Access is restricted to:
//   - platform admins (Users.role === 'admin')
//   - club admins (ClubMembership.role === 'admin', approved)
//   - club selectors (ClubMembership.role === 'selector', approved)
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, selectionId } = await req.json();
    if (!clubId) {
      return Response.json({ error: 'Missing required field: clubId' }, { status: 400 });
    }

    const isPlatformAdmin = user?.role === 'admin';
    if (!isPlatformAdmin) {
      const membership = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId, user_email: user.email, status: 'approved',
      });
      const role = membership[0]?.role;
      if (role !== 'admin' && role !== 'selector') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const query = selectionId
      ? { club_id: clubId, selection_id: selectionId }
      : { club_id: clubId };
    const entries = await base44.asServiceRole.entities.SelectionAuditLog.filter(
      query, '-created_date', 300
    );

    return Response.json({ entries });
  } catch (error) {
    console.error('getSelectionAuditLog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});