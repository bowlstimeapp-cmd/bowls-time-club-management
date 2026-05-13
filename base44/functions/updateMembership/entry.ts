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
 * Secure backend function for all sensitive ClubMembership writes.
 * 
 * Authorization: caller must be an approved club admin (ClubMembership.role === 'admin')
 *               OR a platform admin (Users.role === 'admin').
 *
 * Members can update their own safe profile fields directly via the SDK.
 * This function handles admin-only fields.
 *
 * Actions:
 *   approve      — set status = 'approved'
 *   reject       — set status = 'rejected'
 *   change_role  — set ClubMembership.role
 *   set_status   — set member_status (active/left)
 *   admin_update — update profile fields on behalf of the member
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, membershipId, clubId, updates } = await req.json();

    if (!action || !membershipId || !clubId) {
      return Response.json({ error: 'Missing required fields: action, membershipId, clubId' }, { status: 400 });
    }

    // Verify the caller is a club admin for this specific club
    const platform = isPlatformAdmin(user);
    if (!platform) {
      const callerMembership = await getClubMembership(base44, user.email, clubId);
      if (!callerMembership || callerMembership.role !== 'admin') {
        return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
      }
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
        const allowedRoles = ['admin', 'steward', 'selector', 'live_scorer', 'member'];
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