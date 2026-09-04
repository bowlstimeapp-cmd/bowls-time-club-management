import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await req.json();
    if (!teamId) return Response.json({ error: 'Missing required field: teamId' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.CountyTeam.filter({ id: teamId });
    const team = existing[0];
    if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });

    await requireCountyRole(base44, user, team.county_id, ['admin', 'secretary']);

    if (team.team_type === 'representative') {
      await base44.asServiceRole.entities.CountySelection.deleteMany({ county_team_id: teamId });
    }

    await base44.asServiceRole.entities.CountyTeam.delete(teamId);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to delete team' }, { status: e.status || 500 });
  }
});