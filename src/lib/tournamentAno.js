// ANO = "Add Name Later" generic placeholder used in Pairs/Triples/Fours tournament draws.
// Each ANO instance is a unique string so it can appear multiple times in teams/brackets.
export const ANO_PREFIX = '__ANO__';
export const isAno = (email) => typeof email === 'string' && email.startsWith(ANO_PREFIX);
export const createAnoInstance = () =>
  `${ANO_PREFIX}#${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;