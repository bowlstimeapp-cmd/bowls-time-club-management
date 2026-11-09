import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

// Posts a message to a feedback thread and notifies the other party.
// Also handles the admin-only 'status' action, which records a system message.

const FROM_ADDRESS = 'BowlsTime <contact@bowls-time.com>';
const APP_URL = 'https://app.bowls-time.com';
const MAX_LEN = 2000;
const MAX_PER_HOUR = 10;
const ADMIN_EMAIL_THROTTLE_MS = 30 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  new_feedback: 'New Feedback',
  reviewed: 'Reviewed',
  implemented: 'Implemented',
  abandoned: 'Abandoned',
};

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (value: any) => escapeHtml(value).replace(/\r?\n/g, '<br/>');

const emailShell = (heading: string, bodyHtml: string, buttonHtml: string, footer: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:30px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e5e5e5;">
        <tr><td style="background-color:#059669; padding:20px 28px; color:#000000; font-size:20px; font-weight:700;">BowlsTime</td></tr>
        <tr><td style="padding:28px; color:#0a0a0a; font-size:16px; line-height:1.6;">
          <h2 style="margin:0 0 16px; font-size:20px; color:#0a0a0a;">${heading}</h2>
          ${bodyHtml}
          ${buttonHtml}
          <p style="margin:24px 0 0; font-size:13px; color:#737373; line-height:1.5;">${footer}</p>
        </td></tr>
        <tr><td style="background-color:#f4f4f4; padding:16px 28px; border-top:1px solid #e5e5e5; font-size:12px; color:#737373; text-align:center;">
          Sent by BowlsTime &middot; <a href="${APP_URL}" style="color:#059669;">${APP_URL}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0;"><a href="${href}" style="background-color:#059669; color:#000000; text-decoration:none; font-weight:700; padding:14px 22px; border-radius:8px; display:inline-block;">${label}</a></p>`;

async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secrets.get('Resend_API')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Resend error: ${await res.text()}`);
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const feedback_id = String(body?.feedback_id || '').trim();
    if (!feedback_id) return Response.json({ error: 'feedback_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const feedback = await svc.entities.Feedback.get(feedback_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!feedback) return Response.json({ error: 'Feedback not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isOwner = String(feedback.user_email || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (!isAdmin && !isOwner) return Response.json({ error: 'You can only reply to your own feedback' }, { status: 403 });

    const ownerEmail = feedback.user_email || user.email;
    const nowIso = new Date().toISOString();

    // ── Admin-only status change → system message, no notification ──────────
    if (body?.action === 'status') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const status = String(body?.status || '').trim();
      if (!STATUS_LABELS[status]) return Response.json({ error: 'Unknown status' }, { status: 400 });

      const label = STATUS_LABELS[status];
      const systemText = `Status changed to ${label}`;
      await svc.entities.Feedback.update(feedback_id, { status });
      const created = await svc.entities.FeedbackMessage.create({
        feedback_id,
        feedback_owner_email: ownerEmail,
        sender_role: 'system',
        sender_email: user.email || '',
        sender_name: 'System',
        message: systemText,
        system_event: systemText,
      });
      return Response.json({ message: created });
    }

    // ── Normal message ─────────────────────────────────────────────────────
    const sender_role = isAdmin ? 'admin' : 'user';
    const text = String(body?.message || '').trim();

    if (!text) return Response.json({ error: 'Please write a message' }, { status: 400 });
    if (text.length > MAX_LEN) {
      return Response.json({ error: `Messages must be ${MAX_LEN} characters or fewer` }, { status: 400 });
    }

    if (sender_role === 'user' && feedback.conversation_closed === true) {
      return Response.json({ error: 'This conversation has been closed' }, { status: 403 });
    }

    // Rate limit: max 10 user messages per thread in any rolling hour
    if (sender_role === 'user') {
      const { items } = await svc.entities.FeedbackMessage.filter(
        { feedback_id, sender_role: 'user' },
        { sort: '-created_date', limit: 40 }
      );
      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recent = (items || []).filter((m: any) => new Date(m.created_date).getTime() >= hourAgo);
      if (recent.length >= MAX_PER_HOUR) {
        return Response.json(
          { error: 'You have sent a lot of messages on this feedback recently. Please wait a little while before replying again.' },
          { status: 429 }
        );
      }
    }

    const senderName = sender_role === 'admin'
      ? 'BowlsTime'
      : (feedback.user_name || user.full_name || user.email || 'Member');

    const createdMessage = await svc.entities.FeedbackMessage.create({
      feedback_id,
      feedback_owner_email: ownerEmail,
      sender_role,
      sender_email: user.email || '',
      sender_name: senderName,
      message: text,
    });

    await svc.entities.Feedback.update(feedback_id, {
      last_message_at: nowIso,
      last_message_by: sender_role,
      ...(sender_role === 'user' ? { unread_by_admin: true } : { unread_by_user: true }),
    });

    const threadUrl = `${APP_URL}/Profile?tab=feedback&feedbackId=${encodeURIComponent(feedback_id)}`;
    const title = feedback.title || 'your feedback';

    // ── Notify the other party (never fail the message because of this) ────
    try {
      if (sender_role === 'admin') {
        await svc.entities.Notification.create({
          user_email: ownerEmail,
          type: 'feedback_reply',
          title: 'Reply to your feedback',
          message: `BowlsTime has replied to your feedback: ${title}`,
          is_read: false,
          link_page: 'Profile',
          link_params: `?tab=feedback&feedbackId=${feedback_id}`,
          related_id: feedback_id,
        });

        await sendResendEmail(
          ownerEmail,
          `Reply to your BowlsTime feedback: ${title}`,
          emailShell(
            `Reply to your feedback`,
            `<p style="margin:0 0 12px;">Hi ${escapeHtml(feedback.user_name || 'there')},</p>
             <p style="margin:0 0 16px;">BowlsTime has replied to your feedback &ldquo;${escapeHtml(title)}&rdquo;:</p>
             <div style="background-color:#f0fdf4; border-left:4px solid #059669; padding:14px 16px; border-radius:6px; font-size:15px; color:#0a0a0a;">${nl2br(text)}</div>`,
            button(threadUrl, 'View and reply'),
            'Please reply from within BowlsTime so your answer stays with your feedback. Replies to this email are not part of the conversation.'
          )
        );
      } else {
        const admins = await svc.entities.User.filter({ role: 'admin' });
        const recipients = (admins || [])
          .map((a: any) => a.email)
          .filter((email: string) => email && email.toLowerCase() !== String(ownerEmail).toLowerCase());

        if (recipients.length > 0) {
          await svc.entities.Notification.bulkCreate(
            recipients.map((email: string) => ({
              user_email: email,
              type: 'feedback_reply',
              title: 'New feedback reply',
              message: `${senderName} replied to: ${title}`,
              is_read: false,
              link_page: 'PlatformAdmin',
              link_params: `?tab=feedback&feedbackId=${feedback_id}`,
              related_id: feedback_id,
            }))
          );
        }

        const lastEmailAt = feedback.last_admin_email_at ? new Date(feedback.last_admin_email_at).getTime() : 0;
        if (!lastEmailAt || Date.now() - lastEmailAt > ADMIN_EMAIL_THROTTLE_MS) {
          await svc.entities.Feedback.update(feedback_id, { last_admin_email_at: nowIso });
          await sendResendEmail(
            'contact@bowls-time.com',
            `New reply on feedback: ${title}`,
            emailShell(
              'New feedback reply',
              `<p style="margin:0 0 12px;">${escapeHtml(senderName)} (${escapeHtml(ownerEmail)}) replied to &ldquo;${escapeHtml(title)}&rdquo;:</p>
               <div style="background-color:#f4f4f4; border-left:4px solid #059669; padding:14px 16px; border-radius:6px; font-size:15px; color:#0a0a0a;">${nl2br(text)}</div>`,
              button(`${APP_URL}/PlatformAdmin?tab=feedback&feedbackId=${encodeURIComponent(feedback_id)}`, 'Open in Platform Admin'),
              'You receive this email at most once every 30 minutes per conversation.'
            )
          );
        }
      }
    } catch (notifyError: any) {
      console.error('Feedback notification failed:', notifyError?.message || notifyError);
    }

    return Response.json({ message: createdMessage });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Something went wrong' }, { status: 500 });
  }
}