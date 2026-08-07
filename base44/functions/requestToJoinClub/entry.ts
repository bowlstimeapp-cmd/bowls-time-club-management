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

    // Spam protection: if the most recent rejected request was within the last
    // 24 hours, block resubmission.
    const rejected = existing.filter((m) => m.status === 'rejected');
    if (rejected.length > 0) {
      const mostRecent = rejected.sort((a, b) => {
        const aDate = new Date(a.updated_date || a.created_date);
        const bDate = new Date(b.updated_date || b.created_date);
        return bDate - aDate;
      })[0];
      const rejectDate = new Date(mostRecent.updated_date || mostRecent.created_date);
      const hoursSince = (Date.now() - rejectDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const retryDate = new Date(rejectDate.getTime() + 24 * 60 * 60 * 1000);
        const retryFormatted = retryDate.toLocaleString('en-GB', {
         weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        });
        return Response.json(
          { error: `Your previous request was rejected. You can try again after ${retryFormatted}, or contact the club directly.` },
          { status: 400 }
        );
      }
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

    // Notify club admins about the new request directly (sends email via
    // asServiceRole.integrations.Core.SendEmail — best-effort, does not fail
    // the join request if sending errors).
    try {
      const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
      const club = clubs[0];

      if (club) {
        const memberName = created.user_name || created.user_email;
        const memberEmail = created.user_email;
        const clubName = club.name;

        const requestDate = new Date(created.created_date);
        const formattedDate = requestDate.toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        const formattedTime = requestDate.toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit',
        });

        // Look up all approved admin memberships for this club
        const adminMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
          club_id: clubId,
          role: 'admin',
          status: 'approved',
        });

        const adminEmails = adminMemberships.map(m => m.user_email).filter(Boolean);
        // Include primary_admin_email as fallback if not already in the list
        if (club.primary_admin_email && !adminEmails.includes(club.primary_admin_email)) {
          adminEmails.push(club.primary_admin_email);
        }

        for (const adminEmail of adminEmails) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `New membership request — ${memberName}`,
            body: `
<p>Hello,</p>
<p>A new membership request has been received for <strong>${clubName}</strong>.</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Member name</td><td style="padding:4px 0;font-size:14px;font-weight:600;">${memberName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Email address</td><td style="padding:4px 0;font-size:14px;">${memberEmail}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Requested on</td><td style="padding:4px 0;font-size:14px;">${formattedDate} at ${formattedTime}</td></tr>
</table>
<p>Please log in to the BowlsTime admin panel to approve or reject this request.</p>
<p style="color:#6b7280;font-size:13px;">— BowlsTime</p>
            `.trim(),
          });
        }
      }
    } catch (e) {
      // Email is best-effort — don't fail the join request if it errors
      console.error('Failed to send new-request email:', e?.message || e);
    }

    return Response.json({ success: true, membership: created });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to submit join request' }, { status: 500 });
  }
}