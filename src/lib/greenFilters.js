// Helpers for the indoor / outdoor filters shown to dual-green clubs.

/** True when a record's green passes the filter ('all' or no filter lets everything through). */
export function matchesGreenFilter(green, filter) {
  if (!filter || filter === 'all') return true;
  return green === filter;
}

/** Season of a named competition, used to place selections and draws on a green. */
export function seasonForCompetition(name, competitions = []) {
  if (!name) return null;
  return competitions.find((c) => c.name === name)?.season || null;
}