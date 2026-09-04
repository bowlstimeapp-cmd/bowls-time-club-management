import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId, name, teamType, clubId } = await req.json();
    if (!teamId) return Response.json({ error: 'Missing required field: teamId' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.CountyTeam.filter({ id: teamId });
    const team = existing[0];
    if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });

    await requireCountyRole(base44, user, team.county_id, ['admin', 'secretary']);

    const updates = {};
    if (name !== undefined) updates.name = name;

    const newTeamType = teamType !== undefined ? teamType : team.team_type;
    if (teamType !== undefined) {
      if (!['club', 'representative'].includes(teamType)) return Response.json({ error: 'Invalid team_type' }, { status: 400 });
      updates.team_type = teamType;
    }

    if (newTeamType === 'club') {
      const effectiveClubId = clubId !== undefined ? clubId : team.club_id;
      if (!effectiveClubId) return Response.json({ error: 'club_id is required for club-type teams' }, { status: 400 });
      const aff = await base44.asServiceRole.entities.ClubCountyAffiliation.filter({ club_id: effectiveClubId, county_id: team.county_id, status: 'approved' });
      if (!aff[0]) return Response.json({ error: 'Club is not an approved affiliate of this county' }, { status: 400 });
      updates.club_id = effectiveClubId;
    } else if (newTeamType === 'representative') {
      updates.club_id = null;
    }

    await base44.asServiceRole.entities.CountyTeam.update(teamId, updates);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to update team' }, { status: e.status || 500 });
  }
});