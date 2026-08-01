import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { prospectId, to, subject, body } = await req.json();
    if (!prospectId || !to || !subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailBody = `
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
              ${body.replace(/\n/g, '<br/>')}
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

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body: emailBody,
    });

    const today = new Date().toISOString().split('T')[0];
    await base44.asServiceRole.entities.ProspectClub.update(prospectId, {
      contact_status: 'email_sent',
      last_contacted_date: today,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendProspectEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}