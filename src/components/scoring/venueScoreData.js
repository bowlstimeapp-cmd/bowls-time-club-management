export const SCORE_FIELDS = ['club_scores', 'opposition_scores', 'ends', 'opposition_players'];
export const venueOf = match => match.badge === 'Away' ? 'away' : 'home';
export const emptyScores = () => Object.fromEntries(SCORE_FIELDS.map(field => [field, {}]));

export function venuePayload(values, matches, scope) {
  const rows = matches.filter(match => venueOf(match) === scope);
  return Object.fromEntries(SCORE_FIELDS.map(field => {
    const keys = field === 'opposition_players'
      ? rows.flatMap(match => match.positionsList.map(pos => `${match.key}_${pos}`))
      : rows.map(match => match.key);
    return [field, Object.fromEntries(keys.map(key => [key, values[field]?.[key] ?? '']))];
  }));
}

export function mergeVenueScores(current, incoming, matches, scope) {
  const payload = venuePayload(incoming, matches, scope);
  const next = { ...current };
  for (const field of SCORE_FIELDS) {
    if (incoming[field] !== undefined) next[field] = { ...current[field], ...payload[field] };
  }
  return next;
}