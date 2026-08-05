import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for bulk-removing club memberships.
 *
 * Replaces the `updateClubData({ entity: 'ClubMembership', action: 'bulk_delete' })`
 * call that (a) did not verify the supplied ids belonged to the specified club
 * (cross-club deletion risk) and (b) had no last-administrator protection.
 *
 * Reuses the same validation rules as removeMember():
 *   - caller must be authenticated
 *   - caller must be an approved admin of the specified club (or a platform admin)
 *   - every supplied membership must belong to the specified club (cross-club prevention)
 *   - last-administrator protection: never remove the final active admin
 *
 * Returns a summary: { deleted, skipped, failed, details }
 *   - deleted: count of memberships successfully removed
 *   - skipped: count of memberships skipped (not found, wrong club, or last admin)
 *   - failed:  count of memberships that could not be deleted due to an error
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
    const { clubId, membershipIds } = body;
    if (!clubId) return Response.json({ error: 'Missing required field: clubId' }, { status: 400 });
    if (!Array.isArray(membershipIds) || membershipIds.length === 0) {
      return Response.json({ error: 'MembershipIds must be a non-empty array' }, { status: 400 });
    }

    // Verify the caller is an approved admin of the specified club (or platform admin).
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

    // Fetch all active admins for the club up front, for last-admin protection.
    // (Same rule as removeMember: an admin is active when role='admin', status='approved',
    // and member_status !== 'left'.)
    const activeAdmins = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      role: 'admin',
      status: 'approved',
    });
    const activeAdminCount = activeAdmins.filter(m => m.member_status !== 'left').length;

    const deleted = [];
    const skipped = [];
    const failed = [];
    let adminsDeletedThisBatch = 0;

    for (const membershipId of membershipIds) {
      // Fetch the membership. Wrap in try/catch because an invalid id format throws
      // rather than returning an empty array.
      let membership;
      try {
        const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
        membership = memberships[0];
      } catch {
        skipped.push({ id: membershipId, reason: 'not found' });
        continue;
      }
      if (!membership) {
        skipped.push({ id: membershipId, reason: 'not found' });
        continue;
      }

      // Cross-club prevention: every supplied membership must belong to the specified club.
      if (membership.club_id !== clubId) {
        skipped.push({ id: membershipId, reason: 'does not belong to this club' });
        continue;
      }

      // Last-administrator protection (same rule as removeMember).
      const targetIsActiveAdmin = membership.role === 'admin'
        && membership.status === 'approved'
        && membership.member_status !== 'left';
      if (targetIsActiveAdmin) {
        const remaining = activeAdminCount - adminsDeletedThisBatch;
        if (remaining <= 1) {
          skipped.push({ id: membershipId, reason: 'last remaining administrator' });
          continue;
        }
      }

      // Remove the membership.
      try {
        await base44.asServiceRole.entities.ClubMembership.delete(membershipId);
        deleted.push(membershipId);
        if (targetIsActiveAdmin) adminsDeletedThisBatch++;
      } catch (e) {
        failed.push({ id: membershipId, reason: (e && e.message) || 'delete failed' });
      }
    }

    return Response.json({
      success: true,
      deleted: deleted.length,
      skipped: skipped.length,
      failed: failed.length,
      details: { deleted, skipped, failed },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to remove members' }, { status: 500 });
  }
}