import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Auth helpers (inlined — no local imports in Deno Deploy)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

// ---------------------------------------------------------------------------

/**
 * Secure backend function for ALL ClubMembership writes (create, update, delete).
 *
 * ClubMembership.role (admin/selector/...) is a club-scoped role that Base44 RLS
 * cannot check (RLS can only see the global Users.role). So every write that
 * depends on "is this person an admin of THIS club" has to be verified here,
 * not in the entity's rls block. The entity's rls block only allows direct
 * writes from platform admins (as an emergency escape hatch) — everyone else,
 * including club admins and members editing their own profile, goes through
 * one of the actions below.
 *
 * Actions:
 *   request_join        — (any authenticated user) create a PENDING membership
 *                          for yourself at a club. Forces user_email/role/status
 *                          server-side so it can't be used to self-approve.
 *   self_update          — (the member themselves) update your OWN membership's
 *                          safe profile fields only. role/status/club_id/etc
 *                          are not in the allowed field list, so this can never
 *                          be used to self-promote.
 *   admin_create_member  — (club admin / platform admin) create an approved
 *                          membership for someone else at your club (used for
 *                          "add admin" and CSV bulk import).
 *   remove               — (club admin / platform admin) delete a membership
 *                          at your club.
 *   approve              — set status = 'approved'
 *   reject               — set status = 'rejected'
 *   change_role          — set ClubMembership.role
 *   set_status           — set member_status (active/left)
 *   admin_update         — update profile fields on behalf of a member
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, clubId } = body;

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    // ---------------------------------------------------------------
    // Actions any authenticated user may take on THEMSELVES only.
    // No club-admin check — the safety comes from forcing the target
    // record to be the caller's own, and from the field whitelist.
    // ---------------------------------------------------------------
    if (action === 'request_join') {
      const existing = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
      });
      if (existing.length > 0) {
        return Response.json({ error: 'A membership already exists for this club' }, { status: 400 });
      }

      const profile = body.profile || {};
      const safeCreateFields = [
        'title', 'phone', 'gender', 'emergency_contact_name', 'emergency_contact_phone',
      ];
      const createData = { club_id: clubId, user_email: user.email };
      for (const field of safeCreateFields) {
        if (field in profile) createData[field] = profile[field];
      }
      createData.first_name = user.first_name || '';
      createData.surname = user.surname || '';
      createData.user_name = `${user.first_name || ''} ${user.surname || ''}`.trim();
      // Forced, non-negotiable — this is what stops request_join from being
      // used as a backdoor into admin/approved status.
      createData.role = 'member';
      createData.status = 'pending';

      const created = await base44.asServiceRole.entities.ClubMembership.create(createData);
      return Response.json({ success: true, membership: created });
    }

    if (action === 'self_update') {
      const { membershipId, updates } = body;
      if (!membershipId) return Response.json({ error: 'Missing membershipId' }, { status: 400 });

      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
      const membership = memberships[0];
      if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 });
      if (membership.user_email !== user.email) {
        return Response.json({ error: 'Forbidden: not your membership' }, { status: 403 });
      }

      // Deliberately does NOT include role, status, member_status, club_id,
      // user_email, membership_groups, locker_number(_2), or member_id —
      // those are admin-only and are only reachable via admin_update below.
      const selfAllowedFields = [
        'phone', 'title', 'gender', 'date_of_birth',
        'emergency_contact_name', 'emergency_contact_phone',
        'email_notifications', 'sms_notifications',
      ];
      const updateData = {};
      for (const field of selfAllowedFields) {
        if (updates && field in updates) updateData[field] = updates[field];
      }
      if (Object.keys(updateData).length === 0) {
        return Response.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      await base44.asServiceRole.entities.ClubMembership.update(membershipId, updateData);
      return Response.json({ success: true, updated: updateData });
    }

    // ---------------------------------------------------------------
    // Everything below requires the caller to be a club admin for
    // THIS clubId (or a platform admin).
    // ---------------------------------------------------------------
    const platform = isPlatformAdmin(user);
    if (!platform) {
      const callerMembership = await getClubMembership(base44, user.email, clubId);
      if (!callerMembership || callerMembership.role !== 'admin') {
        return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
      }
    }

    if (action === 'admin_create_member') {
      const memberData = body.memberData || {};
      if (!memberData.user_email) {
        return Response.json({ error: 'user_email is required' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: memberData.user_email,
      });
      if (existing.length > 0) {
        return Response.json({ error: 'This user is already a member of the club' }, { status: 400 });
      }

      const allowedFields = [
        'user_email', 'user_name', 'first_name', 'surname', 'title', 'phone',
        'gender', 'date_of_birth', 'membership_start_date', 'locker_number',
        'locker_number_2', 'emergency_contact_name', 'emergency_contact_phone',
        'role', 'status', 'membership_groups', 'member_id',
      ];
      const createData = { club_id: clubId };
      for (const field of allowedFields) {
        if (field in memberData) createData[field] = memberData[field];
      }
      createData.role = createData.role || 'member';
      createData.status = createData.status || 'approved';

      const created = await base44.asServiceRole.entities.ClubMembership.create(createData);
      return Response.json({ success: true, membership: created });
    }

    if (action === 'remove') {
      const { membershipId } = body;
      if (!membershipId) return Response.json({ error: 'Missing membershipId' }, { status: 400 });

      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
      const membership = memberships[0];
      if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 });
      if (membership.club_id !== clubId) {
        return Response.json({ error: 'Forbidden: membership does not belong to this club' }, { status: 403 });
      }

      const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
      if (clubs[0]?.primary_admin_email && clubs[0].primary_admin_email === membership.user_email) {
        return Response.json({ error: 'Cannot remove the primary admin' }, { status: 400 });
      }

      await base44.asServiceRole.entities.ClubMembership.delete(membershipId);
      return Response.json({ success: true });
    }

    // ---------------------------------------------------------------
    // Existing update actions (approve/reject/change_role/set_status/admin_update)
    // ---------------------------------------------------------------
    const { membershipId, updates } = body;
    if (!membershipId) {
      return Response.json({ error: 'Missing required field: membershipId' }, { status: 400 });
    }

    // Fetch the target membership
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
    const membership = memberships[0];
    if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 });

    if (membership.club_id !== clubId) {
      return Response.json({ error: 'Forbidden: membership does not belong to this club' }, { status: 403 });
    }

    let updateData = {};

    switch (action) {
      case 'approve':
        updateData = { status: 'approved' };
        break;
      case 'reject':
        updateData = { status: 'rejected' };
        break;
      case 'change_role': {
        const allowedRoles = ['admin', 'steward', 'secretary', 'selector', 'live_scorer', 'member'];
        if (!updates?.role || !allowedRoles.includes(updates.role)) {
          return Response.json({ error: 'Invalid role' }, { status: 400 });
        }
        updateData = { role: updates.role };
        break;
      }
      case 'set_status': {
        const allowedStatuses = ['active', 'left'];
        if (!updates?.member_status || !allowedStatuses.includes(updates.member_status)) {
          return Response.json({ error: 'Invalid member_status' }, { status: 400 });
        }
        updateData = {
          member_status: updates.member_status,
          status: updates.member_status === 'left' ? 'rejected' : 'approved',
        };
        break;
      }
      case 'admin_update': {
        const adminAllowedFields = [
          'locker_number', 'locker_number_2', 'membership_groups',
          'member_id', 'membership_start_date', 'user_name',
          'first_name', 'surname', 'title', 'phone',
          'gender', 'date_of_birth', 'emergency_contact_name',
          'emergency_contact_phone', 'email_notifications', 'sms_notifications',
        ];
        updateData = {};
        for (const field of adminAllowedFields) {
          if (updates && field in updates) updateData[field] = updates[field];
        }
        if (Object.keys(updateData).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }
        break;
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await base44.asServiceRole.entities.ClubMembership.update(membershipId, updateData);
    return Response.json({ success: true, updated: updateData });

  } catch (error) {
    console.error('updateMembership error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
