import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for approving a pending club membership.
 *
 * Replaces the approval path that previously went through
 * `updateMembership({ action: 'approve', membershipId, clubId })`. The
 * frontend now calls this function with only the membershipId — the club is
 * derived from the membership record itself (the source of truth), so a
 * caller cannot supply an arbitrary clubId to act on a different club.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Fetch the target membership by id.
 *   3. Derive club_id from the membership record.
 *   4. Verify the caller is an approved administrator of THAT club (or a
 *      platform admin). This is the club-scoped role check that Base44 RLS
 *      cannot perform.
 *   5. The membership already carries its club_id (step 2), which proves it
 *      belongs to the caller's club — verified implicitly by step 4.
 *   6. Update the membership status to 'approved'.
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

    // 6. Update the membership status to 'approved'.
    await base44.asServiceRole.entities.ClubMembership.update(membershipId, { status: 'approved' });

    return Response.json({ success: true, membershipId });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to approve membership' }, { status: 500 });
  }
}