import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  repointField,
  repointArrayField,
  repointObjectValues,
  repointTournaments,
} from '../../shared/memberEmailHelpers.ts';

// ---------------------------------------------------------------------------
// Change a member's email address — repoints the member's ClubMembership and
// all club data referencing their email to the new address.
//
// Authorization: platform admin (User.role === 'admin') OR an approved club
// admin (ClubMembership role 'admin') for the club in the request. Club admins
// may only change club-scoped data — never their own membership or a platform
// admin's email — and the non-club-scoped repoints are skipped for them.
// PlayerElo is explicitly NOT touched (known limitation, same as mergeMembers).
// created_by fields are NOT touched (audit metadata, not identity).
// ---------------------------------------------------------------------------

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, membershipId, newEmail } = await req.json();

    // Platform admin OR approved club admin (role 'admin') for this club
    const isPlatformAdminCaller = user?.role === 'admin';
    if (!isPlatformAdminCaller) {
      if (!clubId) {
        return Response.json({ error: 'Missing required field: clubId' }, { status: 400 });
      }
      const callerMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId, user_email: user.email, status: 'approved',
      });
      if (!callerMemberships.some(m => m.role === 'admin')) {
        return Response.json({ error: 'Forbidden: must be a platform admin or an admin of this club' }, { status: 403 });
      }
    }

    if (!clubId || !membershipId || !newEmail) {
      return Response.json({ error: 'Missing required fields: clubId, membershipId, newEmail' }, { status: 400 });
    }

    const email = String(newEmail).trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return Response.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch the membership
    let membership = null;
    try {
      membership = await sr.entities.ClubMembership.get(membershipId);
    } catch (_e) {
      membership = null;
    }
    if (!membership || membership.club_id !== clubId) {
      return Response.json({ error: 'Membership not found in this club' }, { status: 404 });
    }
    const oldEmail = String(membership.user_email || '').trim();

    if (email.toLowerCase() === oldEmail.toLowerCase()) {
      return Response.json({ error: 'New email is the same as the current email' }, { status: 400 });
    }

    // Refuse if another membership in this club already uses the new email (case-insensitive)
    const allClubMemberships = await sr.entities.ClubMembership.filter({ club_id: clubId });
    const clash = allClubMemberships.find(m => String(m.user_email || '').trim().toLowerCase() === email.toLowerCase());
    if (clash) {
      return Response.json({
        error: 'A member with this email already exists in this club — use Merge Members instead',
      }, { status: 409 });
    }

    if (!oldEmail) {
      return Response.json({ error: 'This membership has no email address to change' }, { status: 400 });
    }

    // Club admins: extra restrictions
    if (!isPlatformAdminCaller) {
      // Refuse changing the caller's own membership
      if (oldEmail.toLowerCase() === String(user.email).toLowerCase()) {
        return Response.json({ error: 'You cannot change the email on your own membership' }, { status: 403 });
      }
      // Refuse if the member's current email belongs to a platform admin user
      const adminUsers = await sr.entities.User.filter({ role: 'admin' });
      if (adminUsers.some(u => String(u.email || '').trim().toLowerCase() === oldEmail.toLowerCase())) {
        return Response.json({ error: 'This member is a platform admin — only a platform admin can change their email' }, { status: 403 });
      }
    }

    const summary = {};
    const errors = [];

    // ── Repoint all club data in parallel ──
    const tasks = [
      // ClubMembership (user_email) — updated individually below to preserve all other fields
      // Booking (booker_email) — club-scoped
      repointField(sr, 'Booking', 'booker_email', oldEmail, email, clubId, true),
      // BookingAuditLog (booker_email) — club-scoped
      repointField(sr, 'BookingAuditLog', 'booker_email', oldEmail, email, clubId, true),
      // MemberAvailability (user_email) — club-scoped
      repointField(sr, 'MemberAvailability', 'user_email', oldEmail, email, clubId, true),
      // TeamSelection (selector_email, home_captain_email, away_captain_email) — club-scoped
      repointField(sr, 'TeamSelection', 'selector_email', oldEmail, email, clubId, true),
      repointField(sr, 'TeamSelection', 'home_captain_email', oldEmail, email, clubId, true),
      repointField(sr, 'TeamSelection', 'away_captain_email', oldEmail, email, clubId, true),
      // TeamSelection.selections — position → member email map (club-scoped)
      repointObjectValues(sr, 'TeamSelection', 'selections', oldEmail, email, clubId),
      // TeamBoardPost (poster_email) — club-scoped
      repointField(sr, 'TeamBoardPost', 'poster_email', oldEmail, email, clubId, true),
      // TeamMatchRequest (from_email, to_email) — club-scoped
      repointField(sr, 'TeamMatchRequest', 'from_email', oldEmail, email, clubId, true),
      repointField(sr, 'TeamMatchRequest', 'to_email', oldEmail, email, clubId, true),
      // LeagueTeam (captain_email) — club-scoped
      repointField(sr, 'LeagueTeam', 'captain_email', oldEmail, email, clubId, true),
      // LeagueTeam.players — array of member emails (club-scoped)
      repointArrayField(sr, 'LeagueTeam', 'players', oldEmail, email, clubId),
      // LeagueFixture (conflict_first, conflict_second, pending) — club-scoped
      repointField(sr, 'LeagueFixture', 'conflict_first_submitted_by_email', oldEmail, email, clubId, true),
      repointField(sr, 'LeagueFixture', 'conflict_second_submitted_by_email', oldEmail, email, clubId, true),
      repointField(sr, 'LeagueFixture', 'pending_submitted_by_email', oldEmail, email, clubId, true),
      // CompetitionEntry (user_email) — club-scoped
      repointField(sr, 'CompetitionEntry', 'user_email', oldEmail, email, clubId, true),
      // CompetitionRegistration (user_email) — club-scoped
      repointField(sr, 'CompetitionRegistration', 'user_email', oldEmail, email, clubId, true),
      // CompetitionInterest (user_email) — club-scoped
      repointField(sr, 'CompetitionInterest', 'user_email', oldEmail, email, clubId, true),
      // ClubAccoladeAssignment (user_email) — club-scoped
      repointField(sr, 'ClubAccoladeAssignment', 'user_email', oldEmail, email, clubId, true),
      // MembershipPayment (user_email) — club-scoped
      repointField(sr, 'MembershipPayment', 'user_email', oldEmail, email, clubId, true),
      // ClubMessage (sender_email) — club-scoped
      repointField(sr, 'ClubMessage', 'sender_email', oldEmail, email, clubId, true),
      // ClubOfficer (member_email) — club-scoped
      repointField(sr, 'ClubOfficer', 'member_email', oldEmail, email, clubId, true),
      // ClubLoginEvent (user_email) — club-scoped
      repointField(sr, 'ClubLoginEvent', 'user_email', oldEmail, email, clubId, true),
      // ScorePrediction (user_email) — club-scoped
      repointField(sr, 'ScorePrediction', 'user_email', oldEmail, email, clubId, true),
      // ClubTournament (players, player_teams, bracket) — special handling
      repointTournaments(sr, clubId, oldEmail, email),
    ];

    // Platform admins only: repoints that are NOT club-scoped — these can hold
    // the same person's records at other clubs
    if (isPlatformAdminCaller) {
      tasks.push(
        // UserUnavailability (user_email)
        repointField(sr, 'UserUnavailability', 'user_email', oldEmail, email, clubId, false),
        // Scorecard (home_player_email, away_player_email, saved_by)
        repointField(sr, 'Scorecard', 'home_player_email', oldEmail, email, clubId, false),
        repointField(sr, 'Scorecard', 'away_player_email', oldEmail, email, clubId, false),
        repointField(sr, 'Scorecard', 'saved_by', oldEmail, email, clubId, false),
        // Notification (user_email)
        repointField(sr, 'Notification', 'user_email', oldEmail, email, clubId, false),
      );
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

    // ── Update the membership itself (keeps name, role, status, groups etc.) ──
    try {
      await sr.entities.ClubMembership.update(membership.id, { user_email: email });
      summary['ClubMembership'] = 1;
    } catch (e) {
      errors.push(`ClubMembership: ${e.message}`);
    }

    // ── Write AuditLog entry ──
    try {
      await sr.entities.AuditLog.create({
        club_id: clubId,
        action: 'member_email_change',
        target_email: oldEmail,
        target_name: membership.user_name || oldEmail,
        performed_by_email: user.email,
        performed_by_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.email,
        old_value: oldEmail,
        new_value: email,
        details: `Changed member email from ${oldEmail} to ${email}. Updated: ${JSON.stringify(summary)}`,
      });
    } catch (e) {
      errors.push(`AuditLog: ${e.message}`);
    }

    if (errors.length > 0) {
      return Response.json({
        success: true,
        partial: true,
        message: 'Email change completed with some errors',
        summary,
        errors,
      });
    }

    return Response.json({
      success: true,
      message: 'Email change completed successfully',
      summary,
    });

  } catch (error) {
    console.error('updateMemberEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}