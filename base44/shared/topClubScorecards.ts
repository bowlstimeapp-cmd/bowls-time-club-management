// ---------------------------------------------------------------------------
// Top Club scorecard helpers — shared between generateSelectionScorecards and
// generateCustomScorecards. Top Club selections use event-style keys
// (`${eventId}_${position}`) instead of rink keys (`rink${n}_Lead`).
// ---------------------------------------------------------------------------

// Outdoor events (SelectionView: TOP_CLUB_OUTDOOR_EVENTS)
export const TOP_CLUB_OUTDOOR_EVENTS = [
  { id: 'two_wood_singles', name: '2 Wood Singles', positions: ['Player'] },
  { id: 'four_wood_singles', name: '4 Wood Singles', positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triples', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

// Indoor events (SelectionView: TOP_CLUB_EVENTS)
export const TOP_CLUB_INDOOR_EVENTS = [
  { id: 'mens_two_wood', name: "Men's Two Wood", positions: ['Player'] },
  { id: 'ladies_two_wood', name: "Ladies' Two Wood", positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triples', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

// Combined, in card order: singles first, then pairs, triples, fours.
// pairs/triple/fours exist in both sets with identical ids and positions, so dedupe by id.
export const ALL_TOP_CLUB_EVENTS = [...TOP_CLUB_OUTDOOR_EVENTS, ...TOP_CLUB_INDOOR_EVENTS]
  .filter((ev, i, arr) => arr.findIndex((e) => e.id === ev.id) === i);

// A selection uses the Top Club (event-based) path when it is a Top Club
// competition with event-style keys, or when its selection keys are event-style
// (no `rink{n}_` prefix). Rink-based keys — including older Top Club (Outdoor)
// selections that used rinks — keep the existing rink path.
export function isTopClubEventSelection(selection) {
  const keys = Object.keys(selection.selections || {});
  // Any event-style key (not starting with `rink{n}_`) → Top Club event path
  if (keys.length > 0 && !keys.some((k) => /^rink\d+_/.test(k))) return true;
  // A Top Club selection with no selections at all is also event-based (yields
  // zero cards, which the generators turn into a clear 400 error)
  const comp = selection.competition || '';
  return keys.length === 0 && (comp === 'Top Club' || comp === 'Top Club (Outdoor)');
}

// Build one scorecard per event that has at least one selected player.
// base = { competition, matchName, dateStr, dayName, time, tag, logoUrl, clubName }
export function buildTopClubScorecards(selection, getMemberName, base) {
  const selections = selection.selections || {};
  const keys = Object.keys(selections);
  const tag = base.tag || '';
  const cards = [];

  for (const ev of ALL_TOP_CLUB_EVENTS) {
    const prefix = `${ev.id}_`;
    const hasPlayer = keys.some((k) => k.startsWith(prefix) && selections[k]);
    if (!hasPlayer) continue;

    const players = ev.positions.map((pos) => {
      const positionKey = `${prefix}${pos}`;
      const email = selections[positionKey];
      return {
        position: pos,
        name: email ? getMemberName(email, positionKey) : '',
      };
    });

    cards.push({
      ...base,
      eventLine: tag ? `${ev.name} · ${tag}` : ev.name,
      players,
    });
  }

  return cards;
}