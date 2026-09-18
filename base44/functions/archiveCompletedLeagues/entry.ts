import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

/**
 * Moves leagues to the archive (status 'completed') when every fixture of the
 * league has been played (status completed or cancelled).
 *
 * Invocation modes:
 *   - Scheduled workflow (no user context) — scans all active leagues.
 *   - Manual (user context) — club admin only, scans that club's leagues.
 *
 * The action is idempotent: leagues already archived are skipped because only
 * leagues with status 'active' are considered.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const clubId = body.clubId || null;

    if (user && !isPlatformAdmin(user)) {
      if (!clubId) {
        return Response.json({ error: 'clubId is required' }, { status: 400 });
      }
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId, user_email: user.email, status: 'approved',
      });
      if (!memberships[0] || memberships[0].role !== 'admin') {
        return Response.json({ error: 'Forbidden: club admin only' }, { status: 403 });
      }
    }

    const leagueFilter = clubId
      ? { club_id: clubId, status: 'active' }
      : { status: 'active' };
    const leagues = await base44.asServiceRole.entities.League.filter(leagueFilter);

    const archived = [];
    for (const league of leagues) {
      const fixtures = await base44.asServiceRole.entities.LeagueFixture.filter({ league_id: league.id });
      if (fixtures.length === 0) continue;
      const allPlayed = fixtures.every(f => f.status === 'completed' || f.status === 'cancelled');
      if (!allPlayed) continue;
      await base44.asServiceRole.entities.League.update(league.id, { status: 'completed' });
      archived.push({ id: league.id, name: league.name });
    }

    return Response.json({ success: true, archived });
  } catch (error) {
    console.error('archiveCompletedLeagues error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}