import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LEAGUE_PREFIX = 'League - ';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId, dryRun = true } = await req.json();

    // 1. Load candidate bookings
    const bookings = await base44.asServiceRole.entities.Booking.filter(
      clubId ? { club_id: clubId } : {}
    );
    const leagueBookings = bookings.filter(b =>
      typeof b.booker_name === 'string' &&
      b.booker_name.startsWith(LEAGUE_PREFIX) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected'
    );

    // 2. Load leagues and build a name -> league map
    const leagues = await base44.asServiceRole.entities.League.filter(
      clubId ? { club_id: clubId } : {}
    );
    const leagueByName = new Map(
      leagues.map(l => [String(l.name || '').trim(), l])
    );

    // 3. Load fixtures + teams for the leagues involved
    const relevantLeagueIds = [...new Set(
      leagueBookings
        .map(b => leagueByName.get(String(b.booker_name).slice(LEAGUE_PREFIX.length).trim()))
        .filter(Boolean)
        .map(l => l.id)
    )];

    const fixtureLists = await Promise.all(
      relevantLeagueIds.map(id => base44.asServiceRole.entities.LeagueFixture.filter({ league_id: id }))
    );
    const allFixtures = fixtureLists.flat();

    const teamLists = await Promise.all(
      relevantLeagueIds.map(id => base44.asServiceRole.entities.LeagueTeam.filter({ league_id: id }))
    );
    const allTeams = teamLists.flat();
    const teamById = new Map(allTeams.map(t => [t.id, t]));

    // 4. Group bookings by (league, date, rink) to find the earliest session per fixture
    const groupKey = (b, leagueId) => `${leagueId}|${b.date}|${b.rink_number}`;
    const groups = new Map();
    for (const b of leagueBookings) {
      const league = leagueByName.get(String(b.booker_name).slice(LEAGUE_PREFIX.length).trim());
      if (!league) continue;
      const key = groupKey(b, league.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }

    // 5. Work out updates
    const bookingUpdates = []; // { id, notes }
    const fixtureLinks = [];   // { id, booking_id }
    const unmatched = [];
    const samples = [];
    let checked = 0;

    for (const b of leagueBookings) {
      checked++;
      const leagueName = String(b.booker_name).slice(LEAGUE_PREFIX.length).trim();
      const league = leagueByName.get(leagueName);
      if (!league) {
        unmatched.push({ booking_id: b.id, booker_name: b.booker_name, date: b.date, rink_number: b.rink_number, reason: 'No league with this name' });
        continue;
      }

      // Match fixture by date + rink (rink_number + date picks the right leg for double-rink leagues)
      const fixture = allFixtures.find(f =>
        f.league_id === league.id &&
        String(f.match_date) === String(b.date) &&
        String(f.rink_number) === String(b.rink_number)
      );
      if (!fixture) {
        unmatched.push({ booking_id: b.id, booker_name: b.booker_name, date: b.date, rink_number: b.rink_number, reason: 'No fixture with this date + rink' });
        continue;
      }

      const homeTeam = teamById.get(fixture.home_team_id);
      const awayTeam = teamById.get(fixture.away_team_id);
      if (!homeTeam?.name || !awayTeam?.name) {
        unmatched.push({ booking_id: b.id, booker_name: b.booker_name, date: b.date, rink_number: b.rink_number, reason: 'Fixture teams missing' });
        continue;
      }

      // Notes update
      const newNotes = `${homeTeam.name} vs ${awayTeam.name}`;
      if (String(b.notes || '') !== newNotes) {
        bookingUpdates.push({ id: b.id, notes: newNotes });
        if (samples.length < 20) {
          samples.push({
            booking_id: b.id,
            booker_name: b.booker_name,
            date: b.date,
            rink_number: b.rink_number,
            before: b.notes || '',
            after: newNotes,
          });
        }
      }

      // Fixture relink: only if the fixture has no booking_id and this booking
      // is the earliest session of that fixture on that rink
      if (!fixture.booking_id) {
        const group = groups.get(groupKey(b, league.id)) || [];
        const earliest = group.slice().sort((x, y) =>
          String(x.start_time).localeCompare(String(y.start_time)) ||
          String(x.id).localeCompare(String(y.id))
        )[0];
        if (earliest && earliest.id === b.id) {
          fixtureLinks.push({ id: fixture.id, booking_id: b.id });
        }
      }
    }

    // 6. Apply updates in batches of ~40 with delays
    let notesUpdated = 0;
    let fixturesRelinked = 0;
    if (!dryRun) {
      const BATCH = 40;
      for (let i = 0; i < bookingUpdates.length; i += BATCH) {
        await base44.asServiceRole.entities.Booking.bulkUpdate(bookingUpdates.slice(i, i + BATCH));
        notesUpdated += Math.min(BATCH, bookingUpdates.length - i);
        if (i + BATCH < bookingUpdates.length) await sleep(500);
      }
      for (let i = 0; i < fixtureLinks.length; i += BATCH) {
        await base44.asServiceRole.entities.LeagueFixture.bulkUpdate(fixtureLinks.slice(i, i + BATCH));
        fixturesRelinked += Math.min(BATCH, fixtureLinks.length - i);
        if (i + BATCH < fixtureLinks.length) await sleep(500);
      }
    }

    return Response.json({
      success: true,
      dryRun,
      checked,
      notesUpdated: dryRun ? bookingUpdates.length : notesUpdated,
      fixturesRelinked: dryRun ? fixtureLinks.length : fixturesRelinked,
      unmatched,
      unmatchedCount: unmatched.length,
      samples,
    });
  } catch (error) {
    console.error('normalizeLeagueBookings error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});