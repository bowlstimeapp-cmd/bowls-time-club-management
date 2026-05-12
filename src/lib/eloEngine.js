/**
 * ELO Engine for Lawn Bowls
 */

const ELO_FLOOR = 800;
const DEFAULT_ELO = 1200;

/**
 * Get K-factor based on matches played
 */
export function getKFactor(matchesPlayed) {
  if (matchesPlayed < 10) return 40;
  if (matchesPlayed < 20) return 30;
  return 20;
}

/**
 * Get margin multiplier based on win margin
 */
export function getMarginMultiplier(margin) {
  const m = Math.abs(margin);
  if (m <= 5) return 0.9;
  if (m <= 10) return 1.0;
  if (m <= 15) return 1.1;
  if (m <= 20) return 1.2;
  return 1.4;
}

/**
 * Calculate expected score (probability of winning)
 */
export function expectedScore(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate new ELO for both players after a match
 * @param {number} winnerElo
 * @param {number} loserElo
 * @param {number} winnerMatchesPlayed
 * @param {number} loserMatchesPlayed
 * @param {number} margin - absolute shot difference
 * @returns {{ newWinnerElo, newLoserElo }}
 */
export function calculateNewElos(winnerElo, loserElo, winnerMatchesPlayed, loserMatchesPlayed, margin) {
  const multiplier = getMarginMultiplier(margin);

  const winnerK = getKFactor(winnerMatchesPlayed) * multiplier;
  const loserK = getKFactor(loserMatchesPlayed) * multiplier;

  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  const newWinnerElo = Math.max(ELO_FLOOR, Math.round(winnerElo + winnerK * (1 - winnerExpected)));
  const newLoserElo = Math.max(ELO_FLOOR, Math.round(loserElo + loserK * (0 - loserExpected)));

  return { newWinnerElo, newLoserElo };
}

/**
 * Apply inactivity decay toward 1200.
 * -3 per week beyond 60 days since last match.
 * Floor: 800. Cap: won't push above 1200 via decay.
 */
export function applyInactivityDecay(elo, lastMatchDate) {
  if (!lastMatchDate) return elo;
  const daysSince = (Date.now() - new Date(lastMatchDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 60) return elo;

  const weeksOverThreshold = Math.floor((daysSince - 60) / 7);
  const drift = weeksOverThreshold * 3;

  if (elo > DEFAULT_ELO) {
    return Math.max(DEFAULT_ELO, elo - drift);
  } else {
    return Math.max(ELO_FLOOR, elo - drift);
  }
}

/**
 * Build the updated PlayerElo record after a match
 */
export function buildUpdatedRecord(record, newElo, won, opponentIdentifier, matchDate) {
  const matchesPlayed = (record.matches_played || 0) + 1;
  const wins = (record.wins || 0) + (won ? 1 : 0);
  const losses = (record.losses || 0) + (won ? 0 : 1);

  const uniqueOpponents = [...(record.unique_opponents || [])];
  if (opponentIdentifier && !uniqueOpponents.includes(opponentIdentifier)) {
    uniqueOpponents.push(opponentIdentifier);
  }

  const is_verified = matchesPlayed >= 15 && uniqueOpponents.length >= 3;
  const is_provisional = matchesPlayed < 15;

  const historyEntry = {
    date: matchDate || new Date().toISOString().split('T')[0],
    elo: newElo,
    opponent: opponentIdentifier || 'Unknown',
    result: won ? 'W' : 'L',
  };

  const elo_history = [...(record.elo_history || []), historyEntry];

  return {
    elo: newElo,
    matches_played: matchesPlayed,
    wins,
    losses,
    unique_opponents: uniqueOpponents,
    is_verified,
    is_provisional,
    elo_history,
    last_match_date: matchDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Fuzzy name match: case-insensitive, trimmed
 */
export function fuzzyNameMatch(name, existingRecords) {
  if (!name) return null;
  const normalised = name.trim().toLowerCase();
  return existingRecords.find(r => (r.player_name || '').trim().toLowerCase() === normalised) || null;
}