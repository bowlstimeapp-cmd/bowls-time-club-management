import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// ---------------------------------------------------------------------------
// Syncs a player's My Profile unavailability (UserUnavailability date ranges)
// into every league team's player_unavailability in My Teams, and notifies
// team captains when the player is selected in a rota on a day they are now
// marked unavailable.
//
// Payload:
//   { user_email?, new_range?: { start_date, end_date }, notify?: boolean }
//   - new_range given  -> merge just that new range (profile add flow)
//   - new_range absent -> populate from ALL stored profile unavailability
//     (used when a player is added to a team, and for backfills)
// ---------------------------------------------------------------------------

function expandRange(start, end) {
  const dates = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return dates;
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.user_email || user.email;
    const notify = body.notify !== false;
    const newRange = body.new_range || null;

    // Guard: when syncing someone other than the caller, require the caller to
    // be a platform admin or a club admin in one of the target's clubs.
    if (targetEmail !== user.email && user.role !== 'admin') {
      const callerMemberships = await base44.asServiceRole.entities.ClubMembership.filter({ user_email: user.email, role: 'admin' });
      const adminClubIds = new Set(callerMemberships.map(m => m.club_id));
      const targetMemberships = await base44.asServiceRole.entities.ClubMembership.filter({ user_email: targetEmail, status: 'approved' });
      const sharesClub = targetMemberships.some(m => adminClubIds.has(m.club_id));
      if (!sharesClub) {
        return Response.json({ error: 'Forbidden: cannot sync unavailability for this player' }, { status: 403 });
      }
    }

    // 1. Determine the dates to merge.
    let newDates = [];
    if (newRange && newRange.start_date && newRange.end_date) {
      newDates = expandRange(newRange.start_date, newRange.end_date);
    } else {
      const records = await base44.asServiceRole.entities.UserUnavailability.filter({ user_email: targetEmail });
      for (const rec of records) {
        newDates.push(...expandRange(rec.start_date, rec.end_date));
      }
    }
    newDates = [...new Set(newDates)].sort();
    if (newDates.length === 0) {
      return Response.json({ success: true, updated_teams: 0, conflicts: [] });
    }

    // 2. Resolve the player's display name.
    let playerName = body.player_name || null;
    if (!playerName) {
      const users = await base44.asServiceRole.entities.User.list();
      const u = users.find(x => x.email === targetEmail);
      if (u) playerName = (u.first_name && u.surname) ? `${u.first_name} ${u.surname}` : (u.full_name || targetEmail);
    }

    // 3. Find the league teams the player belongs to.
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ user_email: targetEmail, status: 'approved' });
    const clubIds = [...new Set(memberships.map(m => m.club_id))];
    const myTeams = [];
    for (const cid of clubIds) {
      const clubTeams = await base44.asServiceRole.entities.LeagueTeam.filter({ club_id: cid });
      myTeams.push(...clubTeams.filter(t => (t.players || []).includes(targetEmail)));
    }

    let updatedTeams = 0;
    const conflicts = [];

    for (const team of myTeams) {
      const existing = team.player_unavailability || {};
      const existingDates = existing[targetEmail] || [];
      const merged = [...new Set([...existingDates, ...newDates])].sort();

      if (merged.length !== existingDates.length) {
        await base44.asServiceRole.entities.LeagueTeam.update(team.id, {
          player_unavailability: { ...existing, [targetEmail]: merged },
        });
        updatedTeams++;
      }

      // 4. Rota conflicts: selected to play on a newly-marked unavailable date.
      if (!notify) continue;
      const leagueFixtures = await base44.asServiceRole.entities.LeagueFixture.filter({ league_id: team.league_id });
      for (const fixture of leagueFixtures) {
        if (!newDates.includes(fixture.match_date)) continue;
        const rotaPlayers = (team.fixture_rota || {})[fixture.id] || [];
        if (!rotaPlayers.includes(targetEmail)) continue;

        const isHome = fixture.home_team_id === team.id;
        const opponentId = isHome ? fixture.away_team_id : fixture.home_team_id;
        let opponentName = null;
        const allLeagueTeams = await base44.asServiceRole.entities.LeagueTeam.filter({ league_id: team.league_id });
        opponentName = allLeagueTeams.find(t => t.id === opponentId)?.name || null;

        conflicts.push({
          team_id: team.id,
          team_name: team.name,
          fixture_id: fixture.id,
          match_date: fixture.match_date,
          opponent: opponentName,
        });

        const captainEmail = team.captain_email;
        if (!captainEmail || captainEmail === targetEmail) continue;

        const relatedId = `${targetEmail}|${team.id}|${fixture.id}`;
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          user_email: captainEmail,
          related_id: relatedId,
        });
        if (existingNotifs.length > 0) continue;

        await base44.asServiceRole.entities.Notification.create({
          user_email: captainEmail,
          type: 'unavailability_conflict',
          title: 'Unavailable player in your rota',
          message: `${playerName || targetEmail} is unavailable on ${formatDate(fixture.match_date)} but is selected to play in ${team.name}'s rota${opponentName ? ` vs ${opponentName}` : ''}.`,
          link_page: 'MyLeagueTeam',
          link_params: `clubId=${team.club_id}`,
          related_id: relatedId,
        });
      }
    }

    return Response.json({ success: true, updated_teams: updatedTeams, conflicts });
  } catch (error) {
    console.error('syncPlayerUnavailability error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}