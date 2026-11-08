export const SCORE_FIELDS = ['club_scores', 'opposition_scores', 'ends', 'opposition_players'];
export const PLAYER_FIELDS = ['opposition_players'];
export const RESULT_FIELDS = ['club_scores', 'opposition_scores', 'ends'];
export const venueOf = match => match.badge === 'Away' ? 'away' : 'home';
export const emptyScores = () => Object.fromEntries(SCORE_FIELDS.map(field => [field, {}]));

export function venuePayload(values, matches, scope, fields = SCORE_FIELDS) {
  const rows = matches.filter(match => venueOf(match) === scope);
  return Object.fromEntries(fields.map(field => {
    const keys = field === 'opposition_players'
      ? rows.flatMap(match => match.positionsList.map(pos => `${match.key}_${pos}`))
      : rows.map(match => match.key);
    return [field, Object.fromEntries(keys.map(key => [key, values[field]?.[key] ?? '']))];
  }));
}

export function mergeVenueScores(current, incoming, matches, scope, fields = SCORE_FIELDS) {
  const payload = venuePayload(incoming, matches, scope, fields);
  const next = { ...current };
  for (const field of fields) {
    if (incoming[field] !== undefined) next[field] = { ...current[field], ...payload[field] };
  }
  return next;
}