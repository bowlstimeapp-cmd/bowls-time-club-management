/**
 * ELO Updater — called after a scorecard is saved.
 * Handles both registered users and guest players (player_email: null).
 */
import {
  calculateNewElos,
  buildUpdatedRecord,
  fuzzyNameMatch,
  applyInactivityDecay,
} from './eloEngine';
import { base44 } from '@/api/base44Client';

const DEFAULT_ELO_RECORD = (name, email) => ({
  player_name: name || 'Unknown',
  player_email: email || null,
  elo: 1200,
  matches_played: 0,
  wins: 0,
  losses: 0,
  unique_opponents: [],
  elo_history: [],
  is_verified: false,
  is_provisional: true,
  elo_processed_scorecards: [],
});

async function getOrCreateRecord(name, email, allRecords) {
  // Try email match first (registered users)
  if (email) {
    const byEmail = allRecords.find(r => r.player_email === email);
    if (byEmail) return { record: byEmail, isNew: false };
  }
  // Try fuzzy name match
  const byName = fuzzyNameMatch(name, allRecords);
  if (byName) return { record: byName, isNew: false };

  // Create new record
  const created = await base44.entities.PlayerElo.create(DEFAULT_ELO_RECORD(name, email));
  return { record: created, isNew: true };
}

/**
 * Main entry point.
 * Call this after a user saves their scorecard.
 *
 * @param {object} scorecard - the full scorecard entity record
 * @param {string} currentUserEmail - email of the user who pressed Save
 */
export async function updateEloFromMatch(scorecard, currentUserEmail) {
  // Guard: already processed
  if ((scorecard.elo_processed_scorecards || []).includes(currentUserEmail)) return;

  const homeTotal = (scorecard.home_scores || []).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const awayTotal = (scorecard.away_scores || []).reduce((s, v) => s + (parseInt(v) || 0), 0);

  // Need at least some scores
  if (homeTotal === 0 && awayTotal === 0) return;

  const homeName = scorecard.home_player || 'Home Player';
  const awayName = scorecard.away_player || 'Away Player';
  const homeEmail = scorecard.home_player_email || null;
  const awayEmail = scorecard.away_player_email || null;

  const margin = Math.abs(homeTotal - awayTotal);
  const homeWon = homeTotal > awayTotal;

  const matchDate = new Date().toISOString().split('T')[0];

  // Fetch all PlayerElo records for matching
  const allRecords = await base44.entities.PlayerElo.list();

  const { record: homeRecord } = await getOrCreateRecord(homeName, homeEmail, allRecords);
  const { record: awayRecord } = await getOrCreateRecord(awayName, awayEmail, allRecords);

  // Apply inactivity decay before calculating new ELOs
  const homeEloDecayed = applyInactivityDecay(homeRecord.elo ?? 1200, homeRecord.last_match_date);
  const awayEloDecayed = applyInactivityDecay(awayRecord.elo ?? 1200, awayRecord.last_match_date);

  const winnerElo = homeWon ? homeEloDecayed : awayEloDecayed;
  const loserElo = homeWon ? awayEloDecayed : homeEloDecayed;
  const winnerMatches = homeWon ? (homeRecord.matches_played || 0) : (awayRecord.matches_played || 0);
  const loserMatches = homeWon ? (awayRecord.matches_played || 0) : (homeRecord.matches_played || 0);

  const { newWinnerElo, newLoserElo } = calculateNewElos(
    winnerElo, loserElo, winnerMatches, loserMatches, margin
  );

  const opponentIdForHome = awayEmail || awayName;
  const opponentIdForAway = homeEmail || homeName;

  const homeUpdates = buildUpdatedRecord(
    homeRecord,
    homeWon ? newWinnerElo : newLoserElo,
    homeWon,
    opponentIdForHome,
    matchDate
  );

  const awayUpdates = buildUpdatedRecord(
    awayRecord,
    homeWon ? newLoserElo : newWinnerElo,
    !homeWon,
    opponentIdForAway,
    matchDate
  );

  // Mark this user's email as processed on the scorecard
  const processed = [...(scorecard.elo_processed_scorecards || []), currentUserEmail];

  await Promise.all([
    base44.entities.PlayerElo.update(homeRecord.id, homeUpdates),
    base44.entities.PlayerElo.update(awayRecord.id, awayUpdates),
    base44.entities.Scorecard.update(scorecard.id, { elo_processed_scorecards: processed }),
  ]);
}