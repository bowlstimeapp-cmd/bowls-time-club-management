import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Secure backend function for the "Request to Join Club" workflow.
 *
 * Replaces the previous direct frontend `base44.entities.ClubMembership.create()`
 * call from ClubSelector.jsx. The frontend no longer sends or controls user_email,
 * role, or status — those are always assigned server-side here.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Determine the user's email from the session.
 *   3. If the user already has an APPROVED membership for the club, return a
 *      meaningful error.
 *   4. If the user already has a PENDING request for the club, return a
 *      meaningful error.
 *   5. Otherwise create a ClubMembership record with:
 *        club_id   = supplied clubId
 *        user_email = authenticated user's email (forced server-side)
 *        role      = 'member'   (forced server-side)
 *        status    = 'pending'  (forced server-side)
 *      plus profile fields copied from the User session (first_name, surname,
 *      user_name) and any safe profile fields supplied by the caller.
 */
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

    // -----------------------------------------------------------------
    // 3 & 4. Check for an existing membership (approved or pending) at
    // this club. We fetch all memberships for this user+club and inspect
    // the status so we can return a distinct, meaningful error for each.
    // -----------------------------------------------------------------
    const existing = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
    });

    const approved = existing.find((m) => m.status === 'approved');
    if (approved) {
      return Response.json(
        { error: 'You are already an approved member of this club.' },
        { status: 400 }
      );
    }

    const pending = existing.find((m) => m.status === 'pending');
    if (pending) {
      return Response.json(
        { error: 'You already have a pending join request for this club. A club admin will review it shortly.' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------
    // 5. Build the new membership record. user_email / role / status are
    // forced server-side — the frontend cannot influence them.
    // -----------------------------------------------------------------
    const profile = body.profile || {};
    const safeProfileFields = [
      'title',
      'phone',
      'gender',
      'emergency_contact_name',
      'emergency_contact_phone',
    ];

    const createData = {
      club_id: clubId,
      user_email: user.email,
      first_name: user.first_name || profile.first_name || '',
      surname: user.surname || profile.surname || '',
      user_name: `${user.first_name || profile.first_name || ''} ${user.surname || profile.surname || ''}`.trim(),
      role: 'member',
      status: 'pending',
    };

    for (const field of safeProfileFields) {
      if (field in profile) createData[field] = profile[field];
    }

    const created = await base44.asServiceRole.entities.ClubMembership.create(createData);

    // Notify club admins about the new request. This replaces the ClubMembership-create
    // automation (which had no user JWT). Called via the user-scoped client so the JWT
    // is forwarded and membershipEmails can verify the caller is the requesting user.
    try {
      await base44.functions.invoke('membershipEmails', {
        type: 'new_request',
        membershipId: created.id,
      });
    } catch (e) {
      // Email is best-effort — don't fail the join request if it errors
      console.error('Failed to send new-request email:', e?.message || e);
    }

    return Response.json({ success: true, membership: created });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to submit join request' }, { status: 500 });
  }
}