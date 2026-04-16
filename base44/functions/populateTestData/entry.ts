import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { addDays, format, addWeeks } from 'npm:date-fns@3.6.0';

const FIRST_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Margaret', 'Dorothy', 'Lisa', 'Nancy', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth',
  'George', 'Kenneth', 'Steven', 'Edward', 'Brian', 'Ronald', 'Anthony', 'Kevin', 'Jason', 'Matthew',
  'Gary', 'Timothy', 'Jose', 'Larry', 'Jeffrey', 'Frank', 'Scott', 'Eric', 'Stephen', 'Andrew'];

const SURNAMES = ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts',
  'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright',
  'Green', 'Harris', 'Cooper', 'King', 'Lee', 'Martin', 'Clarke', 'James', 'Morgan', 'Hughes',
  'Edwards', 'Hill', 'Moore', 'Clark', 'Harrison', 'Scott', 'Young', 'Morris', 'Hall', 'Ward',
  'Turner', 'Carter', 'Phillips', 'Mitchell', 'Patel', 'Adams', 'Campbell', 'Anderson', 'Allen', 'Cook'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomEmail(first, last, index) {
  return `${first.toLowerCase()}.${last.toLowerCase()}${index}@testclub.example`;
}

function generateMembers(clubId, count = 40) {
  const members = [];
  for (let i = 0; i < count; i++) {
    const first = randomItem(FIRST_NAMES);
    const last = randomItem(SURNAMES);
    members.push({
      club_id: clubId,
      user_email: randomEmail(first, last, i),
      user_name: `${first} ${last}`,
      first_name: first,
      surname: last,
      role: 'member',
      status: 'approved',
      member_status: 'active',
      email_notifications: true,
      membership_groups: ['Winter Indoor Member'],
      phone: `07${randomInt(100000000, 999999999)}`,
    });
  }
  return members;
}

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
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    console.log(`Populating test data for club: ${club.name} (${clubId})`);

    // ── 1. Members ──────────────────────────────────────────────────────────
    const memberRecords = generateMembers(clubId, 40);
    const createdMembers = await Promise.all(
      memberRecords.map(m => base44.asServiceRole.entities.ClubMembership.create(m))
    );
    const emails = createdMembers.map(m => m.user_email);
    console.log(`Created ${createdMembers.length} members`);

    // ── 2. Rink Bookings (next 14 days) ─────────────────────────────────────
    const bookingPromises = [];
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const bookingDate = format(addDays(today, dayOffset), 'yyyy-MM-dd');
      // Book roughly half the rinks per day
      const rinksToBook = Math.ceil(rinkCount / 2);
      for (let r = 1; r <= rinksToBook; r++) {
        const startHour = randomItem([10, 12, 14, 16]);
        const endHour = startHour + 2;
        bookingPromises.push(base44.asServiceRole.entities.Booking.create({
          club_id: clubId,
          rink_number: r,
          date: bookingDate,
          start_time: `${String(startHour).padStart(2, '0')}:00`,
          end_time: `${String(endHour).padStart(2, '0')}:00`,
          status: 'approved',
          competition_type: randomItem(['Club', 'Roll-up', 'County']),
          booker_name: randomItem(memberRecords).user_name,
          booker_email: randomItem(emails),
          notes: '',
        }));
      }
    }
    await Promise.all(bookingPromises);
    console.log(`Created ${bookingPromises.length} bookings`);

    // ── 3. Team Selections ───────────────────────────────────────────────────
    const competitionNames = ['Bramley', 'Wessex League', 'Denny'];
    const selectionPromises = [];
    for (let i = 0; i < 6; i++) {
      const matchDate = format(addDays(today, randomInt(3, 30)), 'yyyy-MM-dd');
      const competition = randomItem(competitionNames);
      const homeRinks = 2;
      const selections = {};
      for (let rink = 1; rink <= homeRinks; rink++) {
        ['Lead', '2', '3', 'Skip'].forEach((pos, pi) => {
          const emailIdx = (rink - 1) * 4 + pi;
          selections[`rink${rink}_${pos}`] = emails[emailIdx % emails.length];
        });
      }
      selectionPromises.push(base44.asServiceRole.entities.TeamSelection.create({
        club_id: clubId,
        competition,
        match_date: matchDate,
        match_name: `vs ${randomItem(['Testwood BC', 'Ringwood BC', 'Bournemouth BC', 'Fordingbridge BC', 'Lymington BC'])}`,
        selections,
        selected_rinks: [1, 2],
        home_rinks: homeRinks,
        match_start_time: '14:00',
        match_end_time: '17:00',
        status: i < 4 ? 'published' : 'draft',
        selector_email: emails[0],
      }));
    }
    await Promise.all(selectionPromises);
    console.log(`Created ${selectionPromises.length} team selections`);

    // ── 4. Leagues + Teams + Fixtures ────────────────────────────────────────
    const leagueStartDate = format(today, 'yyyy-MM-dd');
    const leagueEndDate = format(addWeeks(today, 20), 'yyyy-MM-dd');

    const league = await base44.asServiceRole.entities.League.create({
      club_id: clubId,
      name: 'Test Indoor League 2025',
      description: 'Auto-generated test league',
      format: 'fours',
      start_date: leagueStartDate,
      end_date: leagueEndDate,
      start_time: '18:00',
      end_time: '21:00',
      status: 'active',
      fixtures_generated: true,
      bookings_created: false,
      league_rinks: Array.from({ length: Math.min(rinkCount, 4) }, (_, i) => i + 1),
    });

    // Create 6 teams, each with 8 players
    const teamNames = ['Lions', 'Tigers', 'Eagles', 'Falcons', 'Panthers', 'Wolves'];
    const teamPlayers = [];
    const createdTeams = [];
    for (let ti = 0; ti < 6; ti++) {
      const captainEmail = emails[ti * 8 % emails.length];
      const captainMember = createdMembers.find(m => m.user_email === captainEmail);
      const playerEmails = [];
      for (let pi = 0; pi < 8; pi++) {
        playerEmails.push(emails[(ti * 8 + pi) % emails.length]);
      }
      teamPlayers.push(playerEmails);
      const team = await base44.asServiceRole.entities.LeagueTeam.create({
        league_id: league.id,
        club_id: clubId,
        name: teamNames[ti],
        captain_email: captainEmail,
        captain_name: captainMember?.user_name || captainEmail,
        players: playerEmails,
      });
      createdTeams.push(team);
    }

    // Generate round-robin fixtures (each team plays each other once)
    const fixturePromises = [];
    let fixtureDay = 0;
    for (let a = 0; a < createdTeams.length; a++) {
      for (let b = a + 1; b < createdTeams.length; b++) {
        const fixtureDate = format(addWeeks(today, Math.floor(fixtureDay / 2) + 1), 'yyyy-MM-dd');
        const rinkNum = (fixtureDay % Math.min(rinkCount, 4)) + 1;
        fixturePromises.push(base44.asServiceRole.entities.LeagueFixture.create({
          league_id: league.id,
          club_id: clubId,
          home_team_id: createdTeams[a].id,
          away_team_id: createdTeams[b].id,
          match_date: fixtureDate,
          rink_number: rinkNum,
          status: 'scheduled',
        }));
        fixtureDay++;
      }
    }
    await Promise.all(fixturePromises);
    console.log(`Created league with ${createdTeams.length} teams and ${fixturePromises.length} fixtures`);

    // ── 5. Club Tournament (Knockout) ────────────────────────────────────────
    const tournamentPlayers = emails.slice(0, 16);
    // Simple bracket: round of 16
    const bracket = {
      rounds: [
        {
          name: 'Quarter Finals',
          matches: tournamentPlayers.reduce((acc, _, i) => {
            if (i % 2 === 0) acc.push({ id: `qf${i/2}`, player1: tournamentPlayers[i], player2: tournamentPlayers[i+1], winner: null });
            return acc;
          }, []),
        },
        { name: 'Semi Finals', matches: [] },
        { name: 'Final', matches: [] },
      ]
    };

    await base44.asServiceRole.entities.ClubTournament.create({
      club_id: clubId,
      name: 'Test Singles Championship',
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
        members: createdMembers.length,
        bookings: bookingPromises.length,
        selections: selectionPromises.length,
        league: league.name,
        leagueTeams: createdTeams.length,
        leagueFixtures: fixturePromises.length,
        tournament: 'Test Singles Championship',
      }
    });

  } catch (error) {
    console.error('populateTestData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});