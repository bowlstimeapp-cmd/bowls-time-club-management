import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendPushToEmails } from '../../shared/webPush.ts';

// Sends RFC 8291-encrypted Web Push messages; provider acceptance is not a device receipt.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userEmail, userEmails, user_id, title, message, body, url, unreadCount } = await req.json();

    // Resolve target emails into subscriptions
    let emails = [];
    if (user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      emails = users.map(u => u.email);
    } else {
      emails = userEmails || (userEmail ? [userEmail] : []);
    }
    if (emails.length === 0) return Response.json({ success: false, reason: 'no_target' });

    const results = await sendPushToEmails(base44, emails, {
      title,
      body: message || body,
      url,
      unreadCount,
    });

    if (results.length === 0) return Response.json({ success: false, reason: 'no_subscription' });
    return Response.json({ success: results.some(result => result.status === 'sent'), delivery: 'provider_response_only', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}