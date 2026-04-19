import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Support being called directly (frontend) or via entity automation
    const type = body.type || body.args?.type || 'new_request';
    const membershipId = body.membershipId || body.event?.entity_id;

    if (!membershipId || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the membership record
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
    const membership = memberships[0];
    if (!membership) {
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Fetch the club
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: membership.club_id });
    const club = clubs[0];
    if (!club) {
      return Response.json({ error: 'Club not found' }, { status: 404 });
    }

    const memberName = membership.user_name || membership.user_email;
    const memberEmail = membership.user_email;
    const clubName = club.name;

    if (type === 'new_request') {
      // Email all club admins
      const allMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: membership.club_id,
        role: 'admin',
        status: 'approved',
      });

      const requestDate = new Date(membership.created_date);
      const formattedDate = requestDate.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const formattedTime = requestDate.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
      });

      const adminEmails = allMemberships.map(m => m.user_email).filter(Boolean);
      // Also include primary_admin_email as fallback
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

      return Response.json({ sent: adminEmails.length });

    } else if (type === 'approved') {
      // Email the member
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: memberEmail,
        subject: `Your membership request has been approved — ${clubName}`,
        body: `
<p>Hi ${memberName},</p>
<p>Great news! Your request to join <strong>${clubName}</strong> on BowlsTime has been <strong>approved</strong>.</p>
<p>You can now log in and access all of the club's features including rink booking, team selection, leagues, and more.</p>
<p>Welcome to the club!</p>
<p style="color:#6b7280;font-size:13px;">— BowlsTime</p>
        `.trim(),
      });

      return Response.json({ sent: 1 });

    } else {
      return Response.json({ error: 'Unknown type' }, { status: 400 });
    }

  } catch (error) {
    console.error('membershipEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});