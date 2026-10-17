const POSITIONS = ['Skip', '3', '2', 'Lead'];
const TOP_CLUB_EVENTS = [
  { id: 'mens_two_wood', name: "Men's Two Wood", positions: ['Player'] },
  { id: 'ladies_two_wood', name: "Ladies' Two Wood", positions: ['Player'] },
  { id: 'two_wood_singles', name: '2 Wood Singles', positions: ['Player'] },
  { id: 'four_wood_singles', name: '4 Wood Singles', positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triple', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

export default function scoringMatches(selection) {
  if (!selection?.selections) return [];
  if (selection.competition === 'Top Club') {
    return TOP_CLUB_EVENTS.filter(event => event.positions.some(pos => selection.selections[`${event.id}_${pos}`])).map(event => ({
      key: event.id, label: event.name, badge: null,
      positions: Object.fromEntries(event.positions.map(pos => [pos, selection.selections[`${event.id}_${pos}`]])),
      positionsList: event.positions,
    }));
  }
  const matches = [];
  const homeRinksCount = selection.home_rinks || 2;
  for (let rinkNum = 1; rinkNum <= 6; rinkNum++) {
    const positions = Object.fromEntries(POSITIONS.map(pos => [pos, selection.selections[`rink${rinkNum}_${pos}`]]));
    if (Object.values(positions).some(Boolean)) {
      matches.push({
        key: `rink${rinkNum}`, label: String(rinkNum),
        badge: matches.length < homeRinksCount ? 'Home' : 'Away',
        positions, positionsList: POSITIONS,
      });
    }
  }
  return matches;
}