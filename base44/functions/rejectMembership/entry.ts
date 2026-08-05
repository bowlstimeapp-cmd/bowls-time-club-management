import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for rejecting a pending club membership request.
 *
 * Matches the application's current behaviour: sets the membership status to
 * 'rejected' (the request is retained on the record with a rejected status,
 * it is not deleted).
 *
 * The frontend calls this with only the membershipId — the club is derived
 * from the membership record itself (source of truth), so a caller cannot
 * supply an arbitrary clubId to act on a different club.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Fetch the target membership by id.
 *   3. Derive club_id from the membership record.
 *   4. Verify the caller is an approved administrator of THAT club (or a
 *      platform admin). This is the club-scoped role check that Base44 RLS
 *      cannot perform.
 *   5. Update the membership status to 'rejected'.
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

    // 5. Update the membership status to 'rejected'.
    await base44.asServiceRole.entities.ClubMembership.update(membershipId, { status: 'rejected' });

    return Response.json({ success: true, membershipId });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to reject membership' }, { status: 500 });
  }
}