import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  repointField,
  repointTournaments,
} from '../../shared/memberEmailHelpers.ts';

// ---------------------------------------------------------------------------
// Member Identity Merge — repoints all club data from a source (placeholder) email
// to a target (real) email, then deletes the source ClubMembership.
//
// Authorization: caller must be an approved club admin OR platform admin.
// Helpers are shared with updateMemberEmail in base44/shared/memberEmailHelpers.ts.
// PlayerElo is explicitly NOT touched (known limitation).
// created_by fields are NOT touched (audit metadata, not identity).
// ---------------------------------------------------------------------------

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, sourceEmail, targetEmail, migrateFields } = await req.json();
    const mf = (migrateFields && typeof migrateFields === 'object' && !Array.isArray(migrateFields)) ? migrateFields : null;

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
      // UserUnavailability handled conditionally below (see migrateFields)
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

    // ── Unavailability handling — conditional on migrateFields.unavailability ──
    if (!mf || mf.unavailability !== false) {
      // Default behaviour (no migrateFields) and explicit keep: repoint to the target email
      tasks.push(repointField(sr, 'UserUnavailability', 'user_email', sourceEmail, targetEmail, clubId, false));
    } else {
      // Do not migrate: delete the source's records (service role) so they are not orphaned
      tasks.push((async () => {
        try {
          const stale = await sr.entities.UserUnavailability.filter({ user_email: sourceEmail });
          if (stale.length > 0) {
            await sr.entities.UserUnavailability.deleteMany({ user_email: sourceEmail });
          }
          return { key: 'UserUnavailability_deleted', count: stale.length, success: true };
        } catch (e) {
          return { key: 'UserUnavailability_deleted', count: 0, success: false, error: e.message };
        }
      })());
    }

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

    // ── Migrate profile information (opt-in via migrateFields) ──
    // Runs before the source membership is deleted so nothing is lost.
    let profileUpdateSucceeded = true;
    const migratedAudit = [];
    if (mf) {
      const payload = {};
      const copyFields = ['date_of_birth', 'membership_start_date', 'locker_number', 'locker_number_2'];
      for (const field of copyFields) {
        if (mf[field] === true) {
          const srcVal = sourceMembership[field];
          if (srcVal !== undefined && srcVal !== null && String(srcVal).trim() !== '') {
            payload[field] = srcVal;
            migratedAudit.push(`${field}: ${targetMembership[field] || 'none'} -> ${srcVal}`);
          }
        }
      }
      if (mf.membership_groups === true) {
        const targetGroups = Array.isArray(targetMembership.membership_groups) ? targetMembership.membership_groups : [];
        const sourceGroups = Array.isArray(sourceMembership.membership_groups) ? sourceMembership.membership_groups : [];
        if (sourceGroups.length > 0) {
          const union = Array.from(new Set([...targetGroups, ...sourceGroups]));
          payload.membership_groups = union;
          migratedAudit.push(`membership_groups: [${targetGroups.join(', ')}] -> [${union.join(', ')}]`);
        }
      }
      if (Object.keys(payload).length > 0) {
        try {
          await sr.entities.ClubMembership.update(targetMembership.id, payload);
        } catch (e) {
          profileUpdateSucceeded = false;
          errors.push(`ClubMembership profile update: ${e.message}`);
        }
      }
    }

    // ── Delete source ClubMembership (only if the profile update succeeded) ──
    let deletedCount = 0;
    if (profileUpdateSucceeded) {
      for (const sm of sourceMemberships) {
        try {
          await sr.entities.ClubMembership.delete(sm.id);
          deletedCount++;
        } catch (e) {
          errors.push(`ClubMembership.delete: ${e.message}`);
        }
      }
      summary['ClubMembership_deleted'] = deletedCount;
    } else {
      summary['ClubMembership_deleted'] = 0;
      summary['ClubMembership_delete_skipped'] = 1;
    }

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
        details: `Merged ${sourceEmail} into ${targetEmail}. Updated: ${JSON.stringify(summary)}`
          + (migratedAudit.length > 0 ? `. Migrated profile fields: ${migratedAudit.join('; ')}` : '')
          + (mf ? `. Unavailability: ${mf.unavailability === false ? 'deleted (not migrated)' : 'repointed to target'}` : ''),
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