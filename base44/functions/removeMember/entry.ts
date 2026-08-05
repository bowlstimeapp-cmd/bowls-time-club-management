import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for removing a club membership.
 *
 * Replaces the `updateClubData({ entity: 'ClubMembership', action: 'delete' })`
 * call that relied on open-entity RLS. The frontend now calls this with only the
 * membershipId — the club is derived from the membership record itself (source of
 * truth), so a caller cannot supply an arbitrary clubId to act on a different club.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Fetch the target membership by id.
 *   3. Derive club_id from the membership record.
 *   4. Verify the caller is an approved administrator of THAT club (or a
 *      platform admin). This confirms both users belong to the same club — the
 *      club-scoped role check that Base44 RLS cannot perform.
 *   5. Prevent removing the final remaining administrator: if the target is an
 *      active admin and no other active admins remain, reject the request.
 *   6. Remove the membership.
 */
function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const membershipId = body.membershipId;
    if (!membershipId) {
      return Response.json({ error: 'Missing required field: membershipId' }, { status: 400 });
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

    // 5. Prevent removing the final remaining administrator. Only an active admin
    //    (approved, not left) counts toward the admin head-count; the target is
    //    included in that count, so <= 1 means the target is the last one.
    const targetIsActiveAdmin = membership.role === 'admin'
      && membership.status === 'approved'
      && membership.member_status !== 'left';
    if (targetIsActiveAdmin) {
      const allAdmins = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        role: 'admin',
        status: 'approved',
      });
      const activeAdminCount = allAdmins.filter(m => m.member_status !== 'left').length;
      if (activeAdminCount <= 1) {
        return Response.json({ error: 'Cannot remove the last remaining administrator' }, { status: 409 });
      }
    }

    // 6. Remove the membership.
    await base44.asServiceRole.entities.ClubMembership.delete(membershipId);

    return Response.json({ success: true, membershipId });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}