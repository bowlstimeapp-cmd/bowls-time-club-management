import { format, parseISO, addDays, isBefore } from 'date-fns';

// ---------------------------------------------------------------------------
// League fixture generation & rink allocation (shared by LeagueAdmin)
// ---------------------------------------------------------------------------

const generateRoundRobinFixtures = (leagueTeams) => {
  const numTeams = leagueTeams.length;
  if (numTeams < 2) return [];

  // Add bye if odd number of teams
  const teamsList = [...leagueTeams];
  if (numTeams % 2 !== 0) {
    teamsList.push({ id: 'BYE', name: 'BYE' });
  }

  const n = teamsList.length;
  const rounds = [];

  // Round robin algorithm
  for (let round = 0; round < n - 1; round++) {
    const roundMatches = [];
    for (let match = 0; match < n / 2; match++) {
      const home = (round + match) % (n - 1);
      let away = (n - 1 - match + round) % (n - 1);

      if (match === 0) {
        away = n - 1;
      }

      const homeTeam = teamsList[home];
      const awayTeam = teamsList[away];

      // Skip matches with BYE
      if (homeTeam.id !== 'BYE' && awayTeam.id !== 'BYE') {
        roundMatches.push({
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
        });
      }
    }
    rounds.push(roundMatches);
  }

  return rounds;
};

// Assigns rink numbers to a list of matches (already paired with dates).
// Shared by fixture generation and by "Regenerate Rink Allocations" so both
// use the same balanced distribution logic.
export const assignRinksToMatches = (league, unassigned, rinkCount, shuffleSeed = 0) => {
  const allClubRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

  // Helper: get rinks available for a given date string
  const getRinksForDate = (dateKey) => {
    if (league.adjacent_rinks && league.adjacent_rinks_periods && league.adjacent_rinks_periods.length > 0) {
      const period = league.adjacent_rinks_periods.find(p =>
        p.start_date && p.end_date && dateKey >= p.start_date && dateKey <= p.end_date
      );
      if (period && period.rinks && period.rinks.length > 0) {
        return period.rinks.slice().sort((a, b) => a - b);
      }
      // Date not covered by any period — fall back to all rinks
      return allClubRinks;
    }
    // Not adjacent mode — use league_rinks or all
    return (league.league_rinks && league.league_rinks.length > 0)
      ? league.league_rinks.slice().sort((a, b) => a - b)
      : allClubRinks;
  };

  // For overall distribution stats we still need a flat list of all rinks used
  const availableRinks = (league.league_rinks && league.league_rinks.length > 0)
    ? league.league_rinks.slice().sort((a, b) => a - b)
    : allClubRinks;

  // Seeded pseudo-random shuffle (Fisher-Yates) so each redraw is different
  const seededRandom = (() => {
    let seed = shuffleSeed * 1234567 + 42;
    return () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  })();

  const shuffleArray = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // --- Step 2: shuffle fixtures randomly (different each redraw) ---
  const shuffledFixtures = shuffleArray(unassigned);

  // --- Step 3: compute balanced target counts per rink ---
  // base = floor(N / V), first `remainder` rinks get base+1
  const N = shuffledFixtures.length;
  const V = availableRinks.length;
  const base = Math.floor(N / V);
  const remainder = N % V;

  // Shuffle rink order so the "extra" match rinks vary each redraw
  const shuffledRinks = shuffleArray(availableRinks);
  const rinkTarget = {}; // rink -> target count
  shuffledRinks.forEach((r, i) => { rinkTarget[r] = base + (i < remainder ? 1 : 0); });
  const rinkAssigned = {}; // rink -> assigned so far
  availableRinks.forEach(r => { rinkAssigned[r] = 0; });

  // --- Per-team even rink distribution ---
  // Ideal share per rink for each team = 1 / (number of rinks in league settings).
  // A team's games on any single rink must stay within ideal share + 10% tolerance.
  const teamShareCap = (1 / V) + 0.10;
  const teamRinkCount = {}; // `${teamId}:${rink}` -> games on that rink
  const teamGameCount = {}; // teamId -> fixtures assigned so far
  const teamShareOk = (teamId, rink, extraOnRink, extraTeamFixtures) => {
    const share = ((teamRinkCount[`${teamId}:${rink}`] || 0) + extraOnRink) /
      ((teamGameCount[teamId] || 0) + extraTeamFixtures);
    return share <= teamShareCap;
  };

  // --- Step 4: assign rinks respecting date conflicts and targets ---
  const dateRinkUsage = {}; // dateKey -> Set of rinks used that day
  const allFixtures = [];

  if (league.is_double_rink) {
    // Group by tie_id and assign adjacent rink pairs
    const tieGroups = {};
    for (const match of shuffledFixtures) {
      if (!match.tie_id) continue;
      if (!tieGroups[match.tie_id]) tieGroups[match.tie_id] = [];
      tieGroups[match.tie_id].push(match);
    }

    for (const tieId of Object.keys(tieGroups)) {
      const legs = tieGroups[tieId].sort((a, b) => (a.leg || 1) - (b.leg || 2));
      if (legs.length < 2) continue;

      const dateKey = legs[0].match_date;
      if (!dateRinkUsage[dateKey]) dateRinkUsage[dateKey] = new Set();
      const dateRinks = getRinksForDate(dateKey);

      // Find adjacent pair from free rinks on this date
      const freeRinks = dateRinks.filter(r => !dateRinkUsage[dateKey].has(r));

      let chosenPair = null;
      let isAdjacent = true;

      // Try adjacent pairs first
      const adjacentPairs = [];
      for (let i = 0; i < freeRinks.length - 1; i++) {
        if (freeRinks[i + 1] === freeRinks[i] + 1) {
          adjacentPairs.push([freeRinks[i], freeRinks[i + 1]]);
        }
      }

      if (adjacentPairs.length > 0) {
        // Prefer pairs that keep both teams within their per-rink share cap
        const homeId = legs[0].home_team_id;
        const awayId = legs[0].away_team_id;
        const capOkPairs = adjacentPairs.filter(p =>
          teamShareOk(homeId, p[0], 1, 2) && teamShareOk(homeId, p[1], 1, 2) &&
          teamShareOk(awayId, p[0], 1, 2) && teamShareOk(awayId, p[1], 1, 2)
        );
        const pairPool = capOkPairs.length > 0 ? capOkPairs : adjacentPairs;
        // Tie-breaker: least overall rink usage
        chosenPair = pairPool.reduce((best, pair) => {
          const bestUsage = best ? rinkAssigned[best[0]] + rinkAssigned[best[1]] : Infinity;
          const pairUsage = rinkAssigned[pair[0]] + rinkAssigned[pair[1]];
          return pairUsage < bestUsage ? pair : best;
        }, null);
      } else if (freeRinks.length >= 2) {
        // Fallback: nearest available pair (not necessarily adjacent)
        chosenPair = [freeRinks[0], freeRinks[1]];
        let minGap = chosenPair[1] - chosenPair[0];
        for (let i = 0; i < freeRinks.length - 1; i++) {
          const gap = freeRinks[i + 1] - freeRinks[i];
          if (gap < minGap) {
            minGap = gap;
            chosenPair = [freeRinks[i], freeRinks[i + 1]];
          }
        }
        isAdjacent = false;
      }

      if (chosenPair) {
        dateRinkUsage[dateKey].add(chosenPair[0]);
        dateRinkUsage[dateKey].add(chosenPair[1]);
        rinkAssigned[chosenPair[0]]++;
        rinkAssigned[chosenPair[1]]++;
        const tieHome = legs[0].home_team_id;
        const tieAway = legs[0].away_team_id;
        teamGameCount[tieHome] = (teamGameCount[tieHome] || 0) + 2;
        teamGameCount[tieAway] = (teamGameCount[tieAway] || 0) + 2;
        chosenPair.forEach(r => {
          const hk = `${tieHome}:${r}`;
          const ak = `${tieAway}:${r}`;
          teamRinkCount[hk] = (teamRinkCount[hk] || 0) + 1;
          teamRinkCount[ak] = (teamRinkCount[ak] || 0) + 1;
        });

        for (let li = 0; li < legs.length; li++) {
          allFixtures.push({
            league_id: league.id,
            club_id: league.club_id,
            home_team_id: legs[li].home_team_id,
            away_team_id: legs[li].away_team_id,
            match_date: legs[li].match_date,
            rink_number: chosenPair[li],
            status: 'scheduled',
            tie_id: legs[li].tie_id,
            leg: legs[li].leg,
            _nonAdjacent: !isAdjacent,
          });
        }
      }
    }
  } else {
    for (const match of shuffledFixtures) {
      const dateKey = match.match_date;
      if (!dateRinkUsage[dateKey]) dateRinkUsage[dateKey] = new Set();

      // Use date-specific rinks when adjacent rinks mode is enabled
      const dateRinks = getRinksForDate(dateKey);

      // Candidate rinks: not used on this date, still below target, and keeping
      // both teams within their per-rink share cap (ideal share + 10% tolerance)
      const candidates = dateRinks.filter(
        r => !dateRinkUsage[dateKey].has(r) && rinkAssigned[r] < rinkTarget[r] &&
          teamShareOk(match.home_team_id, r, 1, 1) && teamShareOk(match.away_team_id, r, 1, 1)
      );

      // Fallback 1: ignore the per-team cap but still respect rink targets
      const targetOnly = dateRinks.filter(
        r => !dateRinkUsage[dateKey].has(r) && rinkAssigned[r] < rinkTarget[r]
      );

      // Fallback 2: any rink not used on this date (avoids dropping fixtures)
      const fallback = dateRinks.filter(r => !dateRinkUsage[dateKey].has(r));

      const pool = candidates.length > 0 ? candidates : (targetOnly.length > 0 ? targetOnly : fallback);
      if (pool.length === 0) continue; // truly no rink available on this date — skip

      // Among pool, pick the rink with fewest assignments so far (with random tie-breaking)
      const minAssigned = Math.min(...pool.map(r => rinkAssigned[r]));
      const tied = pool.filter(r => rinkAssigned[r] === minAssigned);
      const chosenRink = tied[Math.floor(seededRandom() * tied.length)];

      dateRinkUsage[dateKey].add(chosenRink);
      rinkAssigned[chosenRink]++;
      const homeKey = `${match.home_team_id}:${chosenRink}`;
      const awayKey = `${match.away_team_id}:${chosenRink}`;
      teamRinkCount[homeKey] = (teamRinkCount[homeKey] || 0) + 1;
      teamRinkCount[awayKey] = (teamRinkCount[awayKey] || 0) + 1;
      teamGameCount[match.home_team_id] = (teamGameCount[match.home_team_id] || 0) + 1;
      teamGameCount[match.away_team_id] = (teamGameCount[match.away_team_id] || 0) + 1;

      allFixtures.push({
        league_id: league.id,
        club_id: league.club_id,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        match_date: dateKey,
        rink_number: chosenRink,
        status: 'scheduled',
      });
    }
  }

  return allFixtures;
};

// Generates the full round-robin fixture list for a league (pairings + dates),
// then assigns rinks using the shared balanced distribution logic.
export const buildFixtureList = (league, leagueTeams, rinkCount, shuffleSeed = 0) => {
  const startDate = parseISO(league.start_date);
  const endDate = parseISO(league.end_date);

  // Blacklisted individual dates
  const blacklistedSet = new Set((league.blacklisted_dates || []).map(bl => bl.date));
  const isDateBlacklisted = (date) => blacklistedSet.has(format(date, 'yyyy-MM-dd'));

  // Generate weekly dates
  const weeks = [];
  let currentDate = startDate;
  while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
    if (!isDateBlacklisted(currentDate)) weeks.push(currentDate);
    currentDate = addDays(currentDate, 7);
  }

  const rounds = generateRoundRobinFixtures(leagueTeams);
  const forceEven = league.force_even_fixtures !== false;
  const availableWeeks = weeks.length;
  const repetitions = forceEven ? Math.floor(availableWeeks / rounds.length) : null;

  // --- Step 1: build the flat list of (match, date) pairs without rink assignments ---
  const unassigned = []; // { home_team_id, away_team_id, match_date }
  let weekIndex = 0;

  const collectRound = (round, matchDate) => {
    const dateKey = format(matchDate, 'yyyy-MM-dd');
    for (const match of round) {
      if (league.is_double_rink) {
        const tieId = `${dateKey}-${match.home_team_id}-${match.away_team_id}-${weekIndex}`;
        unassigned.push({ home_team_id: match.home_team_id, away_team_id: match.away_team_id, match_date: dateKey, tie_id: tieId, leg: 1 });
        unassigned.push({ home_team_id: match.home_team_id, away_team_id: match.away_team_id, match_date: dateKey, tie_id: tieId, leg: 2 });
      } else {
        unassigned.push({ home_team_id: match.home_team_id, away_team_id: match.away_team_id, match_date: dateKey });
      }
    }
  };

  if (forceEven) {
    for (let rep = 0; rep < repetitions && weekIndex < availableWeeks; rep++) {
      for (let roundIdx = 0; roundIdx < rounds.length && weekIndex < availableWeeks; roundIdx++) {
        collectRound(rounds[roundIdx], weeks[weekIndex]);
        weekIndex++;
      }
    }
  } else {
    while (weekIndex < availableWeeks) {
      collectRound(rounds[weekIndex % rounds.length], weeks[weekIndex]);
      weekIndex++;
    }
  }

  return assignRinksToMatches(league, unassigned, rinkCount, shuffleSeed);
};

// Re-draw rink allocations for EXISTING fixtures, keeping the dates and
// pairings exactly as they are. Returns the same fixtures with new rink
// numbers (plus _nonAdjacent flags for the distribution modal).
export const reassignRinkAllocations = (league, fixtureList, rinkCount, seed = 0) => {
  const matches = fixtureList.map(f => ({
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    match_date: f.match_date,
    tie_id: f.tie_id,
    leg: f.leg,
  }));
  const withRinks = assignRinksToMatches(league, matches, rinkCount, seed);
  const keyOf = (m) => [m.home_team_id, m.away_team_id, m.match_date, m.tie_id || '', m.leg || ''].join('|');
  const rinkByKey = {};
  withRinks.forEach(m => { rinkByKey[keyOf(m)] = m.rink_number; });
  return fixtureList.map(f => {
    const newRink = rinkByKey[keyOf(f)];
    return { ...f, rink_number: newRink !== undefined ? newRink : f.rink_number };
  });
};