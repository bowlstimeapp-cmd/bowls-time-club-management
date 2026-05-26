import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId, entryId } = await req.json();

    if (!clubId || !entryId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify club admin
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership || membership.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Club admin access required' }, { status: 403 });
    }

    await base44.asServiceRole.entities.CompetitionEntry.delete(entryId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});