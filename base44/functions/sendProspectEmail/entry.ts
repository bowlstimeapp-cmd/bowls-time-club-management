import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function (req: Request): Promise<Response> {
  let prospectId: string | undefined;
  let base44: any;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { prospectId: pid, to, cc, subject, body } = await req.json();
    prospectId = pid;
    if (!prospectId || !to || !subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert \n to <br/> but preserve HTML tags (so links like <a href="..."> stay intact for click tracking)
    const nl2brSafe = (str: string) =>
      str.split(/(<[^>]+>)/g).map(part =>
        part.startsWith('<') && part.endsWith('>') ? part : part.replace(/\n/g, '<br/>')
      ).join('');

    // Parse To recipients (split by ; or ,) — filter out invalid emails (embedded spaces, leading dots, etc.)
    const emailRegex = /^[^\s]+@[^\s]+\.[^\s]+$/;
    const toRecipients = to.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean)
      .filter((e: string) => emailRegex.test(e) && !e.startsWith('.'));
    if (toRecipients.length === 0) {
      return Response.json({ error: 'No valid recipients' }, { status: 400 });
    }

    // Parse CC recipients (split by ; or ,)
    const ccRecipients = cc ? cc.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean) : [];

    const trimmedBody = (body || '').trim();
    const isFullHtml = /^<!DOCTYPE html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);

    let emailHtml;
    if (isFullHtml) {
      // Body is a complete HTML email document — send as-is (no wrapper, no nl2br)
      emailHtml = trimmedBody;
    } else {
      // Plain text / HTML fragment — wrap in the standard shell
      emailHtml = `
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
    }

    // Send via Resend — to + cc on a single email chain
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secrets.get('Resend_API')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BowlsTime <contact@bowls-time.com>',
        to: toRecipients,
        ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
        subject,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', errText);
      try {
        if (prospectId) {
          await base44.asServiceRole.entities.ProspectClub.update(prospectId, { email_status: 'failed' });
        }
      } catch (e) { console.error('Failed to update prospect status:', e); }
      return Response.json({ error: `Resend error: ${errText}` }, { status: 500 });
    }

    const resendData = await resendRes.json();
    const resendEmailId = resendData?.id || null;

    const today = new Date().toISOString().split('T')[0];
    await base44.asServiceRole.entities.ProspectClub.update(prospectId, {
      contact_status: 'email_sent',
      last_contacted_date: today,
      ...(resendEmailId ? { resend_email_id: resendEmailId } : {}),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendProspectEmail error:', error);
    if (prospectId && base44) {
      try {
        await base44.asServiceRole.entities.ProspectClub.update(prospectId, { email_status: 'failed' });
      } catch (e) { console.error('Failed to update prospect status:', e); }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}