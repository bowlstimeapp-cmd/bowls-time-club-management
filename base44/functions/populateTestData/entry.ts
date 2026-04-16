import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { addDays, format, addWeeks } from 'npm:date-fns@3.6.0';

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const OPPONENTS = ['Testwood BC', 'Ringwood BC', 'Bournemouth BC', 'Fordingbridge BC', 'Lymington BC', 'New Milton BC', 'Christchurch BC', 'Wimborne BC'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { clubId } = await req.json();
    if (!clubId) return Response.json({ error: 'clubId required' }, { status: 400 });

    const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
    const club = clubs[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const rinkCount = club.rink_count || 6;
    const sessionDuration = club.session_duration || 2;
    const today = new Date();

    console.log(`Populating test data for club: ${club.name} (${clubId})`);

    // ── Load existing members ────────────────────────────────────────────────
    const existingMembers = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      status: 'approved',
    });

    if (existingMembers.length < 8) {
      return Response.json({ error: 'Club needs at least 8 approved members to generate test data. Please add members first.' }, { status: 400 });
    }

    const memberEmails = existingMembers.map(m => m.user_email);
    const memberNames = {};
    existingMembers.forEach(m => { memberNames[m.user_email] = m.user_name || `${m.first_name || ''} ${m.surname || ''}`.trim() || m.user_email; });

    console.log(`Using ${existingMembers.length} existing members`);

    // ── Load existing competitions ───────────────────────────────────────────
    const [clubComps, platformComps] = await Promise.all([
      base44.asServiceRole.entities.Competition.filter({ club_id: clubId }),
      base44.asServiceRole.entities.Competition.list().then(all => all.filter(c => !c.club_id)),
    ]);
    const allCompetitions = [...clubComps, ...platformComps];

    // ── Helper: create rink bookings for a match ────────────────────────────
    async function bookRinksForMatch(matchDate, selectedRinks, matchStartTime, matchEndTime, label, bookerEmail) {
      const [startHour] = matchStartTime.split(':').map(Number);
      const [endHour] = matchEndTime.split(':').map(Number);
      const bookingPromises = [];
      for (const rinkNum of selectedRinks) {
        for (let hour = startHour; hour < endHour; hour += sessionDuration) {
          const startStr = `${String(hour).padStart(2, '0')}:00`;
          const endStr = `${String(hour + sessionDuration).padStart(2, '0')}:00`;
          bookingPromises.push(base44.asServiceRole.entities.Booking.create({
            club_id: clubId,
            rink_number: rinkNum,
            date: matchDate,
            start_time: startStr,
            end_time: endStr,
            status: 'approved',
            competition_type: 'Club',
            booker_name: label,
            booker_email: bookerEmail || memberEmails[0],
            notes: label,
            admin_notes: '__selection__',
          }));
        }
      }
      return Promise.all(bookingPromises);
    }

    // ── 1. Rink Bookings (general, next 14 days) ────────────────────────────
    const generalBookingPromises = [];
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const bookingDate = format(addDays(today, dayOffset), 'yyyy-MM-dd');
      const rinksToBook = Math.ceil(rinkCount / 3);
      for (let r = 1; r <= rinksToBook; r++) {
        const startHour = randomItem([10, 12, 14, 16]);
        generalBookingPromises.push(base44.asServiceRole.entities.Booking.create({
          club_id: clubId,
          rink_number: r,
          date: bookingDate,
          start_time: `${String(startHour).padStart(2, '0')}:00`,
          end_time: `${String(startHour + sessionDuration).padStart(2, '0')}:00`,
          status: 'approved',
          competition_type: randomItem(['Club', 'Roll-up', 'County']),
          booker_name: memberNames[randomItem(memberEmails)] || 'Test Member',
          booker_email: randomItem(memberEmails),
          notes: '',
        }));
      }
    }
    await Promise.all(generalBookingPromises);
    console.log(`Created ${generalBookingPromises.length} general bookings`);

    // ── 2. Team Selections with rink bookings ───────────────────────────────
    const competitionsForSelections = allCompetitions.length > 0
      ? allCompetitions.slice(0, 3)
      : [{ name: 'Club Match', home_rinks: 2, away_rinks: 0, players_per_rink: 4 }];

    let createdSelectionsCount = 0;
    let createdSelectionBookingsCount = 0;

    for (let i = 0; i < 6; i++) {
      const comp = competitionsForSelections[i % competitionsForSelections.length];
      const homeRinks = comp.home_rinks || 2;
      const playersPerRink = comp.players_per_rink || 4;
      const positionLabels = ['Lead', '2', '3', 'Skip', '5', '6'].slice(0, playersPerRink);
      const matchDate = format(addDays(today, randomInt(3, 45)), 'yyyy-MM-dd');
      const matchStartTime = '14:00';
      const matchEndTime = `${14 + sessionDuration * 2}:00`;
      const opponent = randomItem(OPPONENTS);
      const selectedRinks = Array.from({ length: homeRinks }, (_, idx) => idx + 1);

      // Build player selections from existing members
      const selectionData = {};
      let memberIdx = (i * homeRinks * playersPerRink) % memberEmails.length;
      for (let rink = 1; rink <= homeRinks; rink++) {
        for (const pos of positionLabels) {
          selectionData[`rink${rink}_${pos}`] = memberEmails[memberIdx % memberEmails.length];
          memberIdx++;
        }
      }

      const selection = await base44.asServiceRole.entities.TeamSelection.create({
        club_id: clubId,
        competition: comp.name,
        match_date: matchDate,
        match_name: `vs ${opponent}`,
        selections: selectionData,
        selected_rinks: selectedRinks.map(String),
        home_rinks: homeRinks,
        match_start_time: matchStartTime,
        match_end_time: matchEndTime,
        status: i < 4 ? 'published' : 'draft',
        selector_email: memberEmails[0],
      });
      createdSelectionsCount++;

      // Book rinks for this selection (just like SelectionEditor's handleBookRinks)
      const bookings = await bookRinksForMatch(
        matchDate, selectedRinks, matchStartTime, matchEndTime,
        `${comp.name} vs ${opponent}`, memberEmails[0]
      );
      createdSelectionBookingsCount += bookings.length;
    }
    console.log(`Created ${createdSelectionsCount} selections with ${createdSelectionBookingsCount} rink bookings`);

    // ── 3. League with teams + fixtures + rink bookings ─────────────────────
    const leagueStartDate = format(addDays(today, 7), 'yyyy-MM-dd');
    const leagueEndDate = format(addWeeks(today, 22), 'yyyy-MM-dd');
    const leagueRinks = Array.from({ length: Math.min(rinkCount, 4) }, (_, i) => i + 1);

    const league = await base44.asServiceRole.entities.League.create({
      club_id: clubId,
      name: `Test Indoor League ${new Date().getFullYear()}`,
      description: 'Auto-generated test league',
      format: 'fours',
      start_date: leagueStartDate,
      end_date: leagueEndDate,
      start_time: '18:00',
      end_time: '21:00',
      status: 'active',
      fixtures_generated: true,
      bookings_created: true,
      league_rinks: leagueRinks,
    });

    // Build 6 teams from existing members (overlap is fine for test data)
    const teamNames = ['Lions', 'Tigers', 'Eagles', 'Falcons', 'Panthers', 'Wolves'];
    const playersPerTeam = Math.min(8, Math.floor(memberEmails.length / 3));
    const numTeams = Math.min(6, Math.floor(memberEmails.length / 4));
    const createdTeams = [];

    for (let ti = 0; ti < numTeams; ti++) {
      const playerEmails = [];
      for (let pi = 0; pi < playersPerTeam; pi++) {
        playerEmails.push(memberEmails[(ti * playersPerTeam + pi) % memberEmails.length]);
      }
      const captainEmail = playerEmails[0];
      const team = await base44.asServiceRole.entities.LeagueTeam.create({
        league_id: league.id,
        club_id: clubId,
        name: teamNames[ti],
        captain_email: captainEmail,
        captain_name: memberNames[captainEmail] || captainEmail,
        players: playerEmails,
      });
      createdTeams.push(team);
    }

    // Generate round-robin fixtures + book rinks for each
    const fixturePromises = [];
    const fixtureBookingPromises = [];
    let fixtureWeek = 1;

    for (let a = 0; a < createdTeams.length; a++) {
      for (let b = a + 1; b < createdTeams.length; b++) {
        const fixtureDate = format(addWeeks(today, fixtureWeek), 'yyyy-MM-dd');
        const rinkNum = leagueRinks[(fixtureWeek - 1) % leagueRinks.length];

        const fixture = await base44.asServiceRole.entities.LeagueFixture.create({
          league_id: league.id,
          club_id: clubId,
          home_team_id: createdTeams[a].id,
          away_team_id: createdTeams[b].id,
          match_date: fixtureDate,
          rink_number: rinkNum,
          status: 'scheduled',
        });
        fixturePromises.push(fixture);

        // Book the rink for this fixture (18:00-21:00 in session slots)
        const fixtureBookings = await bookRinksForMatch(
          fixtureDate, [rinkNum], '18:00', '21:00',
          `${league.name}: ${teamNames[a]} vs ${teamNames[b]}`, memberEmails[0]
        );
        fixtureBookingPromises.push(...fixtureBookings);

        if ((a + b) % 2 === 0) fixtureWeek++;
      }
    }

    console.log(`Created league with ${createdTeams.length} teams, ${fixturePromises.length} fixtures and ${fixtureBookingPromises.length} fixture bookings`);

    // ── 4. Club Tournament (Knockout) ────────────────────────────────────────
    const tournamentPlayers = memberEmails.slice(0, Math.min(16, memberEmails.length));
    const bracket = {
      rounds: [
        {
          name: tournamentPlayers.length > 8 ? 'Quarter Finals' : 'Semi Finals',
          matches: [],
        },
        { name: 'Semi Finals', matches: [] },
        { name: 'Final', matches: [] },
      ]
    };
    // Populate first round matches
    for (let i = 0; i < tournamentPlayers.length - 1; i += 2) {
      bracket.rounds[0].matches.push({
        id: `r1m${i/2}`,
        player1: tournamentPlayers[i],
        player2: tournamentPlayers[i + 1],
        winner: null,
      });
    }

    await base44.asServiceRole.entities.ClubTournament.create({
      club_id: clubId,
      name: `Test Singles Championship ${new Date().getFullYear()}`,
      tournament_type: 'knockout',
      comp_format: 'singles',
      players: tournamentPlayers,
      bracket,
      status: 'published',
    });

    console.log('Created club tournament');

    return Response.json({
      success: true,
      summary: {
        membersUsed: existingMembers.length,
        generalBookings: generalBookingPromises.length,
        selections: createdSelectionsCount,
        selectionBookings: createdSelectionBookingsCount,
        league: league.name,
        leagueTeams: createdTeams.length,
        leagueFixtures: fixturePromises.length,
        leagueFixtureBookings: fixtureBookingPromises.length,
        tournament: `Test Singles Championship ${new Date().getFullYear()}`,
      }
    });

  } catch (error) {
    console.error('populateTestData error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});