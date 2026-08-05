import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ---------------------------------------------------------------------------
// Member Identity Merge — repoints all club data from a source (placeholder) email
// to a target (real) email, then deletes the source ClubMembership.
//
// Authorization: caller must be an approved club admin OR platform admin.
// PlayerElo is explicitly NOT touched (known limitation).
// created_by fields are NOT touched (audit metadata, not identity).
// ---------------------------------------------------------------------------

// Helper: repoint a single email field on an entity
async function repointField(sr, entityName, field, sourceEmail, targetEmail, clubId, scopeByClub) {
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

// Helper: replace email in a pipe-separated bracket entry (teams are "email1|email2|...")
function replaceInEntry(entry, sourceEmail, targetEmail) {
  if (!entry || typeof entry !== 'string') return entry;
  return entry.split('|').map(e => e === sourceEmail ? targetEmail : e).join('|');
}

// Helper: walk bracket recursively and replace emails in player1, player2, winner, score_submitted_by
function walkBracket(bracket, sourceEmail, targetEmail) {
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
async function repointTournaments(sr, clubId, sourceEmail, targetEmail) {
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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, sourceEmail, targetEmail } = await req.json();

    if (!clubId || !sourceEmail || !targetEmail) {
      return Response.json({ error: 'Missing required fields: clubId, sourceEmail, targetEmail' }, { status: 400 });
    }
    if (sourceEmail === targetEmail) {
      return Response.json({ error: 'Source and target emails must be different' }, { status: 400 });
    }

    // Verify admin authorization
    const isPlatformAdmin = user?.role === 'admin';
    if (!isPlatformAdmin) {
      const callerMembership = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId, user_email: user.email, status: 'approved',
      });
      if (!callerMembership[0] || callerMembership[0].role !== 'admin') {
        return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
      }
    }

    // Fetch both memberships — both must belong to the same club
    const sourceMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId, user_email: sourceEmail,
    });
    const targetMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId, user_email: targetEmail,
    });

    if (sourceMemberships.length === 0) {
      return Response.json({ error: 'Source membership not found in this club' }, { status: 404 });
    }
    if (targetMemberships.length === 0) {
      return Response.json({ error: 'Target membership not found in this club' }, { status: 404 });
    }

    const sourceMembership = sourceMemberships[0];
    const targetMembership = targetMemberships[0];

    if (sourceMembership.club_id !== targetMembership.club_id) {
      return Response.json({ error: 'Both memberships must belong to the same club' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const summary = {};
    const errors = [];

    // ── Run all repointing tasks in parallel ──
    const tasks = [
      // Booking (booker_email) — club-scoped
      repointField(sr, 'Booking', 'booker_email', sourceEmail, targetEmail, clubId, true),
      // BookingAuditLog (booker_email) — club-scoped
      repointField(sr, 'BookingAuditLog', 'booker_email', sourceEmail, targetEmail, clubId, true),
      // MemberAvailability (user_email) — club-scoped
      repointField(sr, 'MemberAvailability', 'user_email', sourceEmail, targetEmail, clubId, true),
      // UserUnavailability (user_email) — NOT club-scoped
      repointField(sr, 'UserUnavailability', 'user_email', sourceEmail, targetEmail, clubId, false),
      // TeamSelection (selector_email, home_captain_email, away_captain_email) — club-scoped
      repointField(sr, 'TeamSelection', 'selector_email', sourceEmail, targetEmail, clubId, true),
      repointField(sr, 'TeamSelection', 'home_captain_email', sourceEmail, targetEmail, clubId, true),
      repointField(sr, 'TeamSelection', 'away_captain_email', sourceEmail, targetEmail, clubId, true),
      // TeamBoardPost (poster_email) — club-scoped
      repointField(sr, 'TeamBoardPost', 'poster_email', sourceEmail, targetEmail, clubId, true),
      // TeamMatchRequest (from_email, to_email) — club-scoped
      repointField(sr, 'TeamMatchRequest', 'from_email', sourceEmail, targetEmail, clubId, true),
      repointField(sr, 'TeamMatchRequest', 'to_email', sourceEmail, targetEmail, clubId, true),
      // LeagueTeam (captain_email) — club-scoped
      repointField(sr, 'LeagueTeam', 'captain_email', sourceEmail, targetEmail, clubId, true),
      // LeagueFixture (conflict_first, conflict_second, pending) — club-scoped
      repointField(sr, 'LeagueFixture', 'conflict_first_submitted_by_email', sourceEmail, targetEmail, clubId, true),
      repointField(sr, 'LeagueFixture', 'conflict_second_submitted_by_email', sourceEmail, targetEmail, clubId, true),
      repointField(sr, 'LeagueFixture', 'pending_submitted_by_email', sourceEmail, targetEmail, clubId, true),
      // Scorecard (home_player_email, away_player_email, saved_by) — NOT club-scoped
      repointField(sr, 'Scorecard', 'home_player_email', sourceEmail, targetEmail, clubId, false),
      repointField(sr, 'Scorecard', 'away_player_email', sourceEmail, targetEmail, clubId, false),
      repointField(sr, 'Scorecard', 'saved_by', sourceEmail, targetEmail, clubId, false),
      // CompetitionEntry (user_email) — club-scoped
      repointField(sr, 'CompetitionEntry', 'user_email', sourceEmail, targetEmail, clubId, true),
      // ClubAccoladeAssignment (user_email) — club-scoped
      repointField(sr, 'ClubAccoladeAssignment', 'user_email', sourceEmail, targetEmail, clubId, true),
      // MembershipPayment (user_email) — club-scoped
      repointField(sr, 'MembershipPayment', 'user_email', sourceEmail, targetEmail, clubId, true),
      // Notification (user_email) — NOT club-scoped
      repointField(sr, 'Notification', 'user_email', sourceEmail, targetEmail, clubId, false),
      // ClubMessage (sender_email) — club-scoped
      repointField(sr, 'ClubMessage', 'sender_email', sourceEmail, targetEmail, clubId, true),
      // ScorePrediction (user_email) — club-scoped
      repointField(sr, 'ScorePrediction', 'user_email', sourceEmail, targetEmail, clubId, true),
      // ClubTournament (players, player_teams, bracket) — special handling
      repointTournaments(sr, clubId, sourceEmail, targetEmail),
    ];

    const results = await Promise.allSettled(tasks);
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        summary[r.value.key] = r.value.count;
        if (!r.value.success) {
          errors.push(`${r.value.key}: ${r.value.error}`);
        }
      } else {
        errors.push(`Unknown task: ${r.reason?.message || 'Unknown error'}`);
      }
    });

    // ── Delete source ClubMembership (after all data is repointed) ──
    let deletedCount = 0;
    for (const sm of sourceMemberships) {
      try {
        await sr.entities.ClubMembership.delete(sm.id);
        deletedCount++;
      } catch (e) {
        errors.push(`ClubMembership.delete: ${e.message}`);
      }
    }
    summary['ClubMembership_deleted'] = deletedCount;

    // ── Write AuditLog entry ──
    try {
      await sr.entities.AuditLog.create({
        club_id: clubId,
        action: 'member_merge',
        target_email: sourceEmail,
        target_name: sourceMembership.user_name || sourceEmail,
        performed_by_email: user.email,
        performed_by_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.email,
        old_value: sourceEmail,
        new_value: targetEmail,
        details: `Merged ${sourceEmail} into ${targetEmail}. Updated: ${JSON.stringify(summary)}`,
      });
    } catch (e) {
      errors.push(`AuditLog: ${e.message}`);
    }

    if (errors.length > 0) {
      return Response.json({
        success: true,
        partial: true,
        message: 'Merge completed with some errors',
        summary,
        errors,
      });
    }

    return Response.json({
      success: true,
      message: 'Merge completed successfully',
      summary,
    });

  } catch (error) {
    console.error('mergeMembers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}