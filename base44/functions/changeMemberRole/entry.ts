import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for changing a member's club-scoped role.
 *
 * Replaces the `change_role` action that previously went through
 * `updateMembership({ action: 'change_role', membershipId, updates: { role } })`.
 * The frontend now calls this function with only the membershipId and newRole —
 * the club is derived from the membership record itself (source of truth), so a
 * caller cannot supply an arbitrary clubId to act on a different club.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Fetch the target membership by id.
 *   3. Derive club_id from the membership record.
 *   4. Verify the caller is an approved administrator of THAT club (or a
 *      platform admin). This confirms both users belong to the same club — the
 *      club-scoped role check that Base44 RLS cannot perform.
 *   5. Validate the requested role against the allowed set.
 *   6. Apply the role change.
 */
const ALLOWED_ROLES = ['admin', 'steward', 'secretary', 'selector', 'live_scorer', 'member'];

function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { membershipId, newRole } = body;
    if (!membershipId) {
      return Response.json({ error: 'Missing required field: membershipId' }, { status: 400 });
    }
    if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 2. Fetch the target membership. Wrap in try/catch because an invalid id
    //    format causes the filter to throw rather than return an empty array.
    let membership;
    try {
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
      membership = memberships[0];
    } catch {
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }
    if (!membership) {
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }

    const clubId = membership.club_id;

    // 4. Verify the caller is an approved admin of the membership's club.
    if (!isPlatformAdmin(user)) {
      const callerMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
        status: 'approved',
      });
      const callerMembership = callerMemberships[0];
      if (!callerMembership || callerMembership.role !== 'admin') {
        return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
      }
    }

    // 6. Apply the role change.
    await base44.asServiceRole.entities.ClubMembership.update(membershipId, { role: newRole });

    return Response.json({ success: true, membershipId, role: newRole });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to change member role' }, { status: 500 });
  }
}