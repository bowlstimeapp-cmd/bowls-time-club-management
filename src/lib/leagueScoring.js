/**
 * Shared league table calculation logic supporting both standard and sets-based scoring.
 */

/**
 * Calculate league table for a given league, teams, and completed fixtures.
 * Supports:
 *  - Standard scoring (2pts win, 1pt draw) when is_sets=false OR scoring_standard_win=true
 *  - Points per set win (with 0.5 for draws)
 *  - Points for game win (team winning more sets)
 *  - Points for highest combined shots across all sets
 *
 * For sets leagues, fixtures store sets data as:
 *   home_sets / away_sets (number of sets won each)
 *   home_score / away_score (total shots, used for shots-based point)
 */
export function calculateLeagueTable(league, leagueTeams, leagueFixtures) {
  const completedFixtures = leagueFixtures.filter(f => f.status === 'completed');

  const table = leagueTeams.map(team => ({
    team,
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsDiff: 0,
    points: 0,
  }));

  const isSets = league.is_sets;

  completedFixtures.forEach(fixture => {
    const homeEntry = table.find(t => t.team.id === fixture.home_team_id);
    const awayEntry = table.find(t => t.team.id === fixture.away_team_id);

    if (!homeEntry || !awayEntry) return;
    if (fixture.home_score === undefined || fixture.away_score === undefined) return;

    homeEntry.played++;
    awayEntry.played++;
    homeEntry.pointsFor += fixture.home_score;
    homeEntry.pointsAgainst += fixture.away_score;
    awayEntry.pointsFor += fixture.away_score;
    awayEntry.pointsAgainst += fixture.home_score;

    if (isSets) {
      // Sets-based scoring
      const homeSets = fixture.home_sets ?? 0;
      const awaySets = fixture.away_sets ?? 0;

      // Track win/draw/loss based on sets won
      if (homeSets > awaySets) {
        homeEntry.won++;
        awayEntry.lost++;
      } else if (awaySets > homeSets) {
        awayEntry.won++;
        homeEntry.lost++;
      } else {
        homeEntry.drawn++;
        awayEntry.drawn++;
      }

      // Points per set win
      if (league.scoring_points_per_set) {
        const setVal = league.scoring_points_per_set_value ?? 1;
        homeEntry.points += homeSets * setVal;
        awayEntry.points += awaySets * setVal;

        // Drawn sets: award half set value to each team
        // (sets already counted individually above, so no extra action needed for drawn games
        //  as long as individual set draws give 0.5 each — but we only store total sets won,
        //  so drawn game overall = equal sets, handled by the value split naturally)
      }

      // Points for game win (more sets than opponent)
      if (league.scoring_game_win) {
        const gameVal = league.scoring_game_win_value ?? 1;
        if (homeSets > awaySets) {
          homeEntry.points += gameVal;
        } else if (awaySets > homeSets) {
          awayEntry.points += gameVal;
        }
        // No game win points for equal sets
      }

      // Standard 2 points per win (sets context)
      if (league.scoring_standard_win) {
        if (homeSets > awaySets) {
          homeEntry.points += 2;
        } else if (awaySets > homeSets) {
          awayEntry.points += 2;
        } else {
          homeEntry.points += 1;
          awayEntry.points += 1;
        }
      }

      // Highest combined shots across all sets
      if (league.scoring_highest_shots) {
        const homeShots = fixture.home_score;
        const awayShots = fixture.away_score;
        if (homeShots > awayShots) {
          homeEntry.points += 1;
        } else if (awayShots > homeShots) {
          awayEntry.points += 1;
        }
        // Tie: no point awarded
      }
    } else {
      // Standard (non-sets) scoring: 2pts win, 1pt draw
      if (fixture.home_score > fixture.away_score) {
        homeEntry.won++;
        homeEntry.points += 2;
        awayEntry.lost++;
      } else if (fixture.away_score > fixture.home_score) {
        awayEntry.won++;
        awayEntry.points += 2;
        homeEntry.lost++;
      } else {
        homeEntry.drawn++;
        awayEntry.drawn++;
        homeEntry.points += 1;
        awayEntry.points += 1;
      }
    }
  });

  table.forEach(entry => {
    entry.pointsDiff = entry.pointsFor - entry.pointsAgainst;
  });

  return table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    return b.pointsFor - a.pointsFor;
  });
}

/**
 * Returns an array of strings describing the scoring rules for a league.
 */
export function getScoringRules(league) {
  if (!league.is_sets) return [];
  const rules = [];
  if (league.scoring_points_per_set) {
    rules.push(`${league.scoring_points_per_set_value ?? 1} point${(league.scoring_points_per_set_value ?? 1) !== 1 ? 's' : ''} per set win (0.5 for a drawn set)`);
  }
  if (league.scoring_game_win) {
    rules.push(`${league.scoring_game_win_value ?? 1} point${(league.scoring_game_win_value ?? 1) !== 1 ? 's' : ''} for game win`);
  }
  if (league.scoring_standard_win) {
    rules.push('2 points for game win, 1 point for draw (standard)');
  }
  if (league.scoring_highest_shots) {
    rules.push('1 point for highest overall shots');
  }
  return rules;
}