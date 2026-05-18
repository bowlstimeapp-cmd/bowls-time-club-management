/**
 * Shared bracket generation logic.
 * Extracted from TournamentEditor so it can be reused anywhere (e.g. Draw Competition feature).
 */

const FORMAT_SIZES = { singles: 1, pairs: 2, triples: 3, fours: 4 };

/**
 * Generate a knockout bracket from an array of entry strings.
 * For singles, entries are player emails.
 * For pairs/triples/fours, entries are "email1|email2|..." joined strings.
 *
 * @param {string[]} entries  - Array of entry identifiers
 * @returns {{ rounds: object[], players: string[] }} bracket
 */
export function generateKnockoutBracket(entries) {
  if (entries.length < 2) return null;

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = bracketSize - shuffled.length;

  const entriesWithByes = [...shuffled];
  const byeInterval = shuffled.length > 0 ? Math.floor(bracketSize / (byeCount || 1)) : 0;
  for (let i = 0; i < byeCount; i++) {
    const position = Math.min((i + 1) * byeInterval - 1, entriesWithByes.length);
    entriesWithByes.splice(position, 0, null);
  }

  const rounds = [];
  const firstRound = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const match = {
      id: `r1_m${i}`,
      player1: entriesWithByes[i * 2] || null,
      player2: entriesWithByes[i * 2 + 1] || null,
      winner: null,
    };
    if (match.player1 && !match.player2) match.winner = match.player1;
    else if (!match.player1 && match.player2) match.winner = match.player2;
    firstRound.push(match);
  }
  rounds.push(firstRound);

  let prevRoundSize = firstRound.length;
  let roundNum = 2;
  while (prevRoundSize > 1) {
    const round = [];
    for (let i = 0; i < prevRoundSize / 2; i++) {
      round.push({ id: `r${roundNum}_m${i}`, player1: null, player2: null, winner: null });
    }
    rounds.push(round);
    prevRoundSize = round.length;
    roundNum++;
  }

  return { rounds, players: shuffled };
}

/**
 * Build the list of draw entries from competition entries.
 * For singles: array of user_emails.
 * For pairs/triples/fours: array of "lead|member1|member2..." strings.
 */
export function buildDrawEntries(compEntries, compType) {
  const teamSize = FORMAT_SIZES[compType] || 1;
  return compEntries.map(entry => {
    const members = [entry.user_email, ...(entry.team_members || []).map(m => m.email)];
    return members.slice(0, teamSize).join('|');
  });
}