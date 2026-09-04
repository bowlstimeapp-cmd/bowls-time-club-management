import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { countyId, leagueId, homeTeamId, awayTeamId, matchDate, venue } = await req.json();
    if (!countyId || !leagueId || !homeTeamId || !awayTeamId || !matchDate)
      return Response.json({ error: 'Missing required fields: countyId, leagueId, homeTeamId, awayTeamId, matchDate' }, { status: 400 });

    await requireCountyRole(base44, user, countyId, ['admin', 'secretary']);

    // Validate league belongs to county
    const league = (await base44.asServiceRole.entities.CountyLeague.filter({ id: leagueId, county_id: countyId }))[0];
    if (!league) return Response.json({ error: 'League not found' }, { status: 404 });

    // Validate teams belong to county
    const [homeTeam, awayTeam] = await Promise.all([
      base44.asServiceRole.entities.CountyTeam.filter({ id: homeTeamId, county_id: countyId }),
      base44.asServiceRole.entities.CountyTeam.filter({ id: awayTeamId, county_id: countyId }),
    ]);
    if (!homeTeam[0] || !awayTeam[0]) return Response.json({ error: 'Team not found in this county' }, { status: 404 });

    const created = await base44.asServiceRole.entities.CountyLeagueFixture.create({
      county_id: countyId,
      league_id: leagueId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate,
      venue: venue || '',
      status: 'scheduled',
    });
    return Response.json({ success: true, id: created.id, record: created });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to create fixture' }, { status: e.status || 500 });
  }
});