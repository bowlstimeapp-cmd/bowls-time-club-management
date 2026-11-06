import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Sends an admin broadcast email via Resend.
// - testOnly: true  -> sends only to the signed-in platform admin (as "To")
// - testOnly: false -> sends to contact@bowls-time.com with every recipient in BCC
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { subject, body, bcc, testOnly } = await req.json();
    if (!subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert \n to <br/> but preserve HTML tags (so links like <a href="..."> stay intact)
    const nl2brSafe = (str: string) =>
      str.split(/(<[^>]+>)/g).map(part =>
        part.startsWith('<') && part.endsWith('>') ? part : part.replace(/\n/g, '<br/>')
      ).join('');

    const trimmedBody = String(body).trim();
    const isFullHtml = /^<!DOCTYPE html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);

    const emailHtml = isFullHtml
      ? trimmedBody
      : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a5276; padding: 24px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:600;">BowlsTime</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${nl2brSafe(body)}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f4; padding:16px 32px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="margin:0; font-size:12px; color:#999;">BowlsTime &middot; contact@bowls-time.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

    const emailRegex = /^[^\s]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (e: any) => String(e || '').trim();

    // Unique, valid recipients (case-insensitive)
    const seen = new Set<string>();
    const recipients: string[] = [];
    for (const raw of Array.isArray(bcc) ? bcc : []) {
      const email = cleanEmail(raw);
      const key = email.toLowerCase();
      if (!emailRegex.test(email) || email.startsWith('.') || seen.has(key)) continue;
      seen.add(key);
      recipients.push(email);
    }

    const isTest = testOnly === true;
    if (!isTest && recipients.length === 0) {
      return Response.json({ error: 'No valid recipients' }, { status: 400 });
    }

    const sendOne = async (payload: Record<string, any>) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secrets.get('Resend_API')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Resend API error:', errText);
        throw new Error(`Resend error: ${errText}`);
      }
      return res.json();
    };

    if (isTest) {
      await sendOne({
        from: 'BowlsTime <contact@bowls-time.com>',
        to: [user.email],
        subject,
        html: emailHtml,
      });
      return Response.json({ success: true, sent: 1, testOnly: true });
    }

    // Resend caps recipients per request — send in batches of BCC
    const BATCH_SIZE = 45;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await sendOne({
        from: 'BowlsTime <contact@bowls-time.com>',
        to: ['contact@bowls-time.com'],
        bcc: batch,
        subject,
        html: emailHtml,
      });
      sent += batch.length;
    }

    return Response.json({ success: true, sent });
  } catch (error: any) {
    console.error('sendAdminBroadcastEmail error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}