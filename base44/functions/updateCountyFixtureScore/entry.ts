import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isPlatformAdmin, requireCountyRole } from '../../shared/countyAuth.ts';

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({ club_id: clubId, user_email: userEmail, status: 'approved' });
  return results[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { countyId, fixtureId, homeScore, awayScore, homeSets, awaySets, submitterTeamId, isSetsLeague, resolve } = await req.json();
    if (!countyId || !fixtureId) return Response.json({ error: 'Missing required fields: countyId, fixtureId' }, { status: 400 });

    const fixture = (await base44.asServiceRole.entities.CountyLeagueFixture.filter({ id: fixtureId, county_id: countyId }))[0];
    if (!fixture) return Response.json({ error: 'Fixture not found' }, { status: 404 });

    // ── RESOLVE: county admin/secretary directly sets final scores (clears pending/conflict) ──
    if (resolve) {
      await requireCountyRole(base44, user, countyId, ['admin', 'secretary']);
      const hs = parseInt(homeScore), as_ = parseInt(awayScore);
      const hsS = isSetsLeague ? parseInt(homeSets) : null, asS = isSetsLeague ? parseInt(awaySets) : null;
      await base44.asServiceRole.entities.CountyLeagueFixture.update(fixtureId, {
        home_score: hs, away_score: as_,
        home_sets: isSetsLeague ? hsS : null, away_sets: isSetsLeague ? asS : null,
        status: 'completed',
        pending_home_score: null, pending_away_score: null, pending_home_sets: null, pending_away_sets: null,
        pending_submitted_by_email: null, pending_submitted_by_team_id: null,
        conflict_first_home_score: null, conflict_first_away_score: null, conflict_first_home_sets: null, conflict_first_away_sets: null,
        conflict_first_team_id: null, conflict_first_submitted_by_email: null,
        conflict_second_home_score: null, conflict_second_away_score: null, conflict_second_home_sets: null, conflict_second_away_sets: null,
        conflict_second_team_id: null, conflict_second_submitted_by_email: null,
      });
      return Response.json({ success: true, status: 'resolved', message: 'Result entered by county admin' });
    }

    // ── NORMAL SUBMISSION: pending → confirm → conflict pattern ──
    if (!submitterTeamId) return Response.json({ error: 'Missing submitterTeamId' }, { status: 400 });
    const hs = parseInt(homeScore), as_ = parseInt(awayScore);
    if (isNaN(hs) || isNaN(as_)) return Response.json({ error: 'Invalid scores' }, { status: 400 });
    const hsS = isSetsLeague ? parseInt(homeSets) : null;
    const asS = isSetsLeague ? parseInt(awaySets) : null;

    const submitterTeam = (await base44.asServiceRole.entities.CountyTeam.filter({ id: submitterTeamId, county_id: countyId }))[0];
    if (!submitterTeam) return Response.json({ error: 'Submitter team not found' }, { status: 404 });

    // Auth: county admin/secretary/selector can submit for any team;
    // club admin/selector can submit for their club-type team
    if (!isPlatformAdmin(user)) {
      let authorized = false;
      const countyMembership = (await base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email, status: 'approved' }))[0];
      if (countyMembership && ['admin', 'secretary', 'selector'].includes(countyMembership.role)) {
        authorized = true;
      }
      if (!authorized && submitterTeam.team_type === 'club' && submitterTeam.club_id) {
        const clubMembership = await getClubMembership(base44, user.email, submitterTeam.club_id);
        if (clubMembership && ['admin', 'selector'].includes(clubMembership.role)) {
          authorized = true;
        }
      }
      if (!authorized) return Response.json({ error: 'Forbidden: not authorized to submit scores for this team' }, { status: 403 });
    }

    const hasPending = fixture.pending_submitted_by_email != null;
    const pendingFromOtherTeam = hasPending && fixture.pending_submitted_by_team_id !== submitterTeamId;

    if (!hasPending) {
      // First submission
      await base44.asServiceRole.entities.CountyLeagueFixture.update(fixtureId, {
        pending_home_score: hs, pending_away_score: as_,
        ...(isSetsLeague ? { pending_home_sets: hsS, pending_away_sets: asS } : {}),
        pending_submitted_by_email: user.email, pending_submitted_by_team_id: submitterTeamId,
      });
      return Response.json({ success: true, status: 'pending', message: 'Score submitted — waiting for opposing team' });
    }

    if (pendingFromOtherTeam) {
      const scoresMatch = fixture.pending_home_score === hs && fixture.pending_away_score === as_ &&
        (!isSetsLeague || (fixture.pending_home_sets === hsS && fixture.pending_away_sets === asS));

      if (scoresMatch) {
        // Confirmed
        await base44.asServiceRole.entities.CountyLeagueFixture.update(fixtureId, {
          home_score: hs, away_score: as_,
          ...(isSetsLeague ? { home_sets: hsS, away_sets: asS } : {}),
          status: 'completed',
          pending_home_score: null, pending_away_score: null, pending_home_sets: null, pending_away_sets: null,
          pending_submitted_by_email: null, pending_submitted_by_team_id: null,
        });
        return Response.json({ success: true, status: 'confirmed', message: 'Score confirmed — match completed' });
      }

      // Conflict
      await base44.asServiceRole.entities.CountyLeagueFixture.update(fixtureId, {
        conflict_first_home_score: fixture.pending_home_score, conflict_first_away_score: fixture.pending_away_score,
        conflict_first_home_sets: fixture.pending_home_sets ?? null, conflict_first_away_sets: fixture.pending_away_sets ?? null,
        conflict_first_team_id: fixture.pending_submitted_by_team_id, conflict_first_submitted_by_email: fixture.pending_submitted_by_email,
        conflict_second_home_score: hs, conflict_second_away_score: as_,
        conflict_second_home_sets: isSetsLeague ? hsS : null, conflict_second_away_sets: isSetsLeague ? asS : null,
        conflict_second_team_id: submitterTeamId, conflict_second_submitted_by_email: user.email,
      });

      // Notify county admins
      try {
        const admins = await base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId, role: 'admin', status: 'approved' });
        await Promise.all(admins.map(admin =>
          base44.asServiceRole.entities.Notification.create({
            user_email: admin.user_email,
            type: 'team_request',
            title: '⚠ County score conflict',
            message: `Score conflict in county fixture. Submitting team: ${submitterTeam.name}.`,
            link_page: 'CountyAdmin',
            link_params: `countyId=${countyId}`,
          })
        ));
      } catch (e) { /* non-critical */ }

      return Response.json({ success: true, status: 'conflict', message: 'Score mismatch — county admin notified to resolve' });
    }

    // Same team already submitted
    return Response.json({ error: 'Your team has already submitted. Waiting for the opposing team.' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to submit score' }, { status: e.status || 500 });
  }
});