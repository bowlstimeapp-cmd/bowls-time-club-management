import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for a member leaving a club (self-service).
 *
 * The frontend calls this with only the clubId — the function locates the
 * authenticated user's own membership in that club, so a caller cannot supply
 * another user's email or an arbitrary membershipId.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Locate the caller's membership in the club (by club_id + user email).
 *   3. Prevent leaving if the caller is the final remaining administrator —
 *      removing the last admin would orphan the club.
 *   4. Remove the membership otherwise.
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
    const clubId = body.clubId;
    if (!clubId) {
      return Response.json({ error: 'Missing required field: clubId' }, { status: 400 });
    }

    // 2. Locate the authenticated user's membership in this club.
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
    });
    const membership = memberships[0];
    if (!membership) {
      return Response.json({ error: 'You are not a member of this club' }, { status: 404 });
    }

    // 3. Prevent leaving if the user is the final remaining administrator. Only
    //    an active admin (approved, not left) counts; the caller is included in
    //    the count, so <= 1 means the caller is the last one.
    const callerIsActiveAdmin = membership.role === 'admin'
      && membership.status === 'approved'
      && membership.member_status !== 'left';
    if (callerIsActiveAdmin) {
      const allAdmins = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        role: 'admin',
        status: 'approved',
      });
      const activeAdminCount = allAdmins.filter(m => m.member_status !== 'left').length;
      if (activeAdminCount <= 1) {
        return Response.json({ error: 'Cannot leave: you are the last remaining administrator' }, { status: 409 });
      }
    }

    // 4. Remove the membership.
    await base44.asServiceRole.entities.ClubMembership.delete(membership.id);

    return Response.json({ success: true, clubId });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to leave club' }, { status: 500 });
  }
}