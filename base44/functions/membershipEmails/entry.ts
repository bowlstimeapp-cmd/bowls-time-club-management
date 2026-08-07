import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth helpers (inlined — no local imports in Deno Deploy; see clubAuth/entry.ts)
function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

async function hasClubRole(base44, userEmail, clubId, roles) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId,
    user_email: userEmail,
    status: 'approved',
  });
  const membership = results[0];
  if (!membership) return false;
  return roles.includes(membership.role);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    // Support being called directly (frontend) or via entity automation
    const type = body.type || body.args?.type;
    const membershipId = body.membershipId || body.event?.entity_id;

    if (type === 'new_request') {
      return Response.json({ error: "'new_request' type is no longer supported by this function. It is handled directly in requestToJoinClub." }, { status: 400 });
    }

    if (!membershipId || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the membership record
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ id: membershipId });
    const membership = memberships[0];
    if (!membership) {
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Authorization (club_id is derived from the membership record — source of truth):
    //  - 'approved': caller must be a club admin (or platform admin) for this club
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (type === 'approved') {
      if (!isPlatformAdmin(user) && !await hasClubRole(base44, user.email, membership.club_id, ['admin'])) {
        return Response.json({ error: 'Forbidden: requires club admin role' }, { status: 403 });
      }
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

    if (type === 'approved') {
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

      // Push notification (best-effort)
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          userEmail: memberEmail,
          title: `Welcome to ${clubName}!`,
          message: 'Your membership has been approved. Tap to get started.',
          url: 'https://app.bowls-time.com',
        });
      } catch { /* push is best-effort */ }

      return Response.json({ sent: 1 });

    } else {
      return Response.json({ error: 'Unknown type' }, { status: 400 });
    }

  } catch (error) {
    console.error('membershipEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});