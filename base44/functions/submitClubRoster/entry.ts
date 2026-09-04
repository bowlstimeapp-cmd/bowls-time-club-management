import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isPlatformAdmin } from '../../shared/countyAuth.ts';

function isPlatformAdminUser(user) { return isPlatformAdmin(user); }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({ club_id: clubId, user_email: userEmail, status: 'approved' });
  return results[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fixtureId, side, roster } = await req.json();
    if (!fixtureId || !side || !Array.isArray(roster)) return Response.json({ error: 'Missing required fields: fixtureId, side, roster' }, { status: 400 });
    if (!['home', 'away'].includes(side)) return Response.json({ error: 'Invalid side, must be "home" or "away"' }, { status: 400 });

    const fixtureResults = await base44.asServiceRole.entities.CountyLeagueFixture?.filter({ id: fixtureId });
    if (!fixtureResults) {
      return Response.json({ error: 'CountyLeagueFixture entity not available yet (Phase 4)' }, { status: 501 });
    }
    const fixture = fixtureResults[0];
    if (!fixture) return Response.json({ error: 'Fixture not found' }, { status: 404 });

    const teamId = side === 'home' ? fixture.home_team_id : fixture.away_team_id;
    if (!teamId) return Response.json({ error: `No ${side} team assigned to this fixture` }, { status: 400 });

    const teamRecord = (await base44.asServiceRole.entities.CountyTeam.filter({ id: teamId }))[0];
    if (!teamRecord) return Response.json({ error: 'Team not found' }, { status: 404 });
    if (teamRecord.team_type !== 'club') {
      return Response.json({ error: 'Representative teams use CountySelection, not rosters' }, { status: 400 });
    }
    if (!teamRecord.club_id) return Response.json({ error: 'Team has no associated club' }, { status: 400 });

    if (!isPlatformAdminUser(user)) {
      const membership = await getClubMembership(base44, user.email, teamRecord.club_id);
      if (!membership || !['admin', 'selector'].includes(membership.role)) {
        return Response.json({ error: 'Forbidden: requires club admin or selector role for this team\'s club' }, { status: 403 });
      }
    }

    const validatedRoster = roster.map(r => ({
      name: typeof r?.name === 'string' ? r.name : '',
      club_member_email: typeof r?.club_member_email === 'string' ? r.club_member_email : null,
    }));

    const field = side === 'home' ? 'home_roster' : 'away_roster';
    await base44.asServiceRole.entities.CountyLeagueFixture.update(fixtureId, { [field]: validatedRoster });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to submit roster' }, { status: e.status || 500 });
  }
});