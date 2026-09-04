import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { countyId, name, teamType, clubId } = await req.json();
    if (!countyId || !name || !teamType) return Response.json({ error: 'Missing required fields: countyId, name, teamType' }, { status: 400 });
    if (!['club', 'representative'].includes(teamType)) return Response.json({ error: 'Invalid team_type' }, { status: 400 });

    await requireCountyRole(base44, user, countyId, ['admin', 'secretary']);

    if (teamType === 'club') {
      if (!clubId) return Response.json({ error: 'club_id is required for club-type teams' }, { status: 400 });
      const aff = await base44.asServiceRole.entities.ClubCountyAffiliation.filter({ club_id: clubId, county_id: countyId, status: 'approved' });
      if (!aff[0]) return Response.json({ error: 'Club is not an approved affiliate of this county' }, { status: 400 });
    }

    const created = await base44.asServiceRole.entities.CountyTeam.create({
      county_id: countyId,
      name,
      team_type: teamType,
      club_id: teamType === 'club' ? clubId : null,
    });
    return Response.json({ success: true, id: created.id, record: created });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to create team' }, { status: e.status || 500 });
  }
});