/**
 * Rota Generation Utility
 * Handles fixture rota generation with controlled randomness, balancing, and fairness.
 */

/**
 * Fisher-Yates shuffle — mutates and returns the array.
 * seed is optional: if provided, uses a simple seeded PRNG to make output deterministic per-seed.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Weighted random selection from a scored array.
 * Items with lower scores get higher weight (inverse weighting).
 */
function weightedPick(scoredPlayers, alreadySelected) {
  const candidates = scoredPlayers.filter(({ player }) => !alreadySelected.includes(player));
  if (candidates.length === 0) return null;

  // Invert scores so lower-scored (more deserving) players have higher probability.
  const maxScore = Math.max(...candidates.map(c => c.score)) + 1;
  const weights = candidates.map(c => maxScore - c.score);
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  let rand = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return candidates[i].player;
  }
  return candidates[candidates.length - 1].player;
}

/**
 * Generate a rota for a set of fixtures.
 *
 * @param {string[]} players - Array of player emails
 * @param {object[]} fixtures - Fixtures to generate for (sorted by date)
 * @param {object} unavailability - { [playerEmail]: string[] } of unavailable date strings
 * @param {number} playersPerGame - Required players per fixture (3 or 4)
 * @param {number} randomSeed - Controls randomness offset (pass Date.now() or attempt index)
 * @returns {object} rota - { [fixtureId]: string[] }
 */
export function generateRotaForFixtures(players, fixtures, unavailability, playersPerGame, randomSeed = 0) {
  // Shuffle the player list to introduce variety between runs
  const shuffledPlayers = shuffle(players);

  // Rotate the shuffled list by randomSeed to get different starting priorities each attempt
  const rotateBy = randomSeed % shuffledPlayers.length;
  const rotatedPlayers = [
    ...shuffledPlayers.slice(rotateBy),
    ...shuffledPlayers.slice(0, rotateBy),
  ];

  const playerGameCount = {};
  rotatedPlayers.forEach(p => (playerGameCount[p] = 0));

  const previousGroupings = {};
  rotatedPlayers.forEach(p => (previousGroupings[p] = new Set()));

  const rota = {};

  for (const fixture of fixtures) {
    const fixtureDate = fixture.match_date;

    const availablePlayers = rotatedPlayers.filter(player => {
      const unavail = unavailability[player] || [];
      return !unavail.includes(fixtureDate);
    });

    if (availablePlayers.length < playersPerGame) {
      // Not enough available — use whoever is available (best-effort)
      const sorted = [...availablePlayers].sort((a, b) => playerGameCount[a] - playerGameCount[b]);
      rota[fixture.id] = sorted;
      sorted.forEach(p => playerGameCount[p]++);
      continue;
    }

    const selectedPlayers = [];

    for (let slot = 0; slot < playersPerGame; slot++) {
      const scoredPlayers = availablePlayers.map(player => {
        const gamesPlayed = playerGameCount[player];
        // Penalise players who've been grouped with already-selected players before
        const groupingPenalty = selectedPlayers.reduce((sum, sel) => {
          return sum + (previousGroupings[player].has(sel) ? 1 : 0);
        }, 0);
        return {
          player,
          score: gamesPlayed * 10 + groupingPenalty * 5,
        };
      });

      // Use weighted random pick rather than deterministic sort, so results vary between runs
      const picked = weightedPick(scoredPlayers, selectedPlayers);
      if (picked) selectedPlayers.push(picked);
    }

    // Update game counts and grouping history
    selectedPlayers.forEach(p => {
      playerGameCount[p]++;
      selectedPlayers.forEach(other => {
        if (p !== other) previousGroupings[p].add(other);
      });
    });

    rota[fixture.id] = selectedPlayers;
  }

  return rota;
}

/**
 * Compare two rotas to determine if they are identical.
 */
export function rotasAreIdentical(rotaA, rotaB) {
  const keysA = Object.keys(rotaA).sort();
  const keysB = Object.keys(rotaB).sort();
  if (keysA.join(',') !== keysB.join(',')) return false;
  return keysA.every(k => {
    const a = [...(rotaA[k] || [])].sort();
    const b = [...(rotaB[k] || [])].sort();
    return a.join(',') === b.join(',');
  });
}

/**
 * Generate a rota, retrying up to maxAttempts times if the result is identical to the previous one.
 */
export function generateWithRetry(players, fixtures, unavailability, playersPerGame, previousRota, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = Date.now() + attempt * 1000 + Math.floor(Math.random() * 999);
    const newRota = generateRotaForFixtures(players, fixtures, unavailability, playersPerGame, attempt);
    if (!previousRota || !rotasAreIdentical(newRota, previousRota)) {
      return newRota;
    }
  }
  // After maxAttempts, return the last generated result even if identical (edge case: very small teams)
  return generateRotaForFixtures(players, fixtures, unavailability, playersPerGame, maxAttempts);
}