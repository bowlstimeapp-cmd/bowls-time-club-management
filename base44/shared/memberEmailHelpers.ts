// ---------------------------------------------------------------------------
// Member identity helpers — shared between mergeMembers and updateMemberEmail.
// Repoint all club data that references a member's email from one address to another.
// ---------------------------------------------------------------------------

// Helper: repoint a single email field on an entity
export async function repointField(sr, entityName, field, sourceEmail, targetEmail, clubId, scopeByClub) {
  const query = scopeByClub ? { [field]: sourceEmail, club_id: clubId } : { [field]: sourceEmail };
  const key = `${entityName}_${field}`;

  // Count matching records (best-effort)
  let count = 0;
  try {
    const records = await sr.entities[entityName].filter(query);
    count = records.length;
  } catch (_countErr) {
    count = -1; // count unknown — proceed with update anyway
  }

  if (count === 0) return { key, count: 0, success: true };

  // Update matching records
  try {
    await sr.entities[entityName].updateMany(query, { $set: { [field]: targetEmail } });
    return { key, count, success: true };
  } catch (e) {
    return { key, count, success: false, error: e.message };
  }
}

// Helper: repoint an array-of-emails field (e.g. LeagueTeam.players)
export async function repointArrayField(sr, entityName, field, sourceEmail, targetEmail, clubId) {
  const key = `${entityName}.${field}`;
  try {
    const records = await sr.entities[entityName].filter({ club_id: clubId, [field]: sourceEmail });
    let count = 0;
    for (const rec of records) {
      const arr = rec[field];
      if (Array.isArray(arr)) {
        await sr.entities[entityName].update(rec.id, { [field]: arr.map(p => p === sourceEmail ? targetEmail : p) });
        count++;
      }
    }
    return { key, count, success: true };
  } catch (e) {
    return { key, count: 0, success: false, error: e.message };
  }
}

// Helper: deep-replace a member's email inside a JSON object/array (e.g. TeamSelection.selections)
export function deepReplaceEmails(value, sourceEmail, targetEmail) {
  if (typeof value === 'string') return value === sourceEmail ? targetEmail : value;
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map(v => {
      const nv = deepReplaceEmails(v, sourceEmail, targetEmail);
      if (nv !== v) changed = true;
      return nv;
    });
    return changed ? out : value;
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const out = {};
    for (const k of Object.keys(value)) {
      const nv = deepReplaceEmails(value[k], sourceEmail, targetEmail);
      if (nv !== value[k]) changed = true;
      out[k] = nv;
    }
    return changed ? out : value;
  }
  return value;
}

// Helper: repoint an object field whose (nested) string values are member emails
export async function repointObjectValues(sr, entityName, field, sourceEmail, targetEmail, clubId) {
  const key = `${entityName}.${field}`;
  try {
    const records = await sr.entities[entityName].filter({ club_id: clubId });
    let count = 0;
    for (const rec of records) {
      if (!rec[field]) continue;
      const replaced = deepReplaceEmails(rec[field], sourceEmail, targetEmail);
      if (replaced !== rec[field]) {
        await sr.entities[entityName].update(rec.id, { [field]: replaced });
        count++;
      }
    }
    return { key, count, success: true };
  } catch (e) {
    return { key, count: 0, success: false, error: e.message };
  }
}

// Helper: replace email in a pipe-separated bracket entry (teams are "email1|email2|...")
export function replaceInEntry(entry, sourceEmail, targetEmail) {
  if (!entry || typeof entry !== 'string') return entry;
  return entry.split('|').map(e => e === sourceEmail ? targetEmail : e).join('|');
}

// Helper: walk bracket recursively and replace emails in player1, player2, winner, score_submitted_by
export function walkBracket(bracket, sourceEmail, targetEmail) {
  let modified = false;
  const newBracket = JSON.parse(JSON.stringify(bracket));
  if (newBracket.rounds) {
    for (const round of newBracket.rounds) {
      for (const match of round) {
        if (match.player1) { const v = replaceInEntry(match.player1, sourceEmail, targetEmail); if (v !== match.player1) { match.player1 = v; modified = true; } }
        if (match.player2) { const v = replaceInEntry(match.player2, sourceEmail, targetEmail); if (v !== match.player2) { match.player2 = v; modified = true; } }
        if (match.winner) { const v = replaceInEntry(match.winner, sourceEmail, targetEmail); if (v !== match.winner) { match.winner = v; modified = true; } }
        if (match.score_submitted_by === sourceEmail) { match.score_submitted_by = targetEmail; modified = true; }
      }
    }
  }
  return { bracket: newBracket, modified };
}

// Helper: repoint ClubTournament data (players array, player_teams nested arrays, bracket)
export async function repointTournaments(sr, clubId, sourceEmail, targetEmail) {
  try {
    const tournaments = await sr.entities.ClubTournament.filter({ club_id: clubId });
    let count = 0;
    for (const tournament of tournaments) {
      let modified = false;
      const update = {};

      // players array
      if (tournament.players && tournament.players.includes(sourceEmail)) {
        update.players = tournament.players.map(p => p === sourceEmail ? targetEmail : p);
        modified = true;
      }

      // player_teams (nested arrays of arrays of emails)
      if (tournament.player_teams && tournament.player_teams.some(team => team && team.includes(sourceEmail))) {
        update.player_teams = tournament.player_teams.map(team =>
          (team || []).map(p => p === sourceEmail ? targetEmail : p)
        );
        modified = true;
      }

      // bracket (recursive walk)
      if (tournament.bracket) {
        const result = walkBracket(tournament.bracket, sourceEmail, targetEmail);
        if (result.modified) { update.bracket = result.bracket; modified = true; }
      }

      if (modified) {
        await sr.entities.ClubTournament.update(tournament.id, update);
        count++;
      }
    }
    return { key: 'ClubTournament', count, success: true };
  } catch (e) {
    return { key: 'ClubTournament', count: 0, success: false, error: e.message };
  }
}