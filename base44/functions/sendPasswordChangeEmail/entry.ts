import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, name } = await req.json();

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
              <p style="margin: 0 0 16px; font-size:16px; color:#333;">Dear ${name},</p>
              <p style="margin: 0 0 24px; font-size:16px; color:#333;">
                Your BowlsTime account password was recently changed.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff3cd; border-left: 4px solid #ffc107; border-radius:4px; padding:16px; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0; font-size:15px; color:#856404; font-weight:600;">Did not make this change?</p>
                    <p style="margin:8px 0 0; font-size:14px; color:#856404;">
                      If you did not change your password, please contact us immediately at
                      <a href="mailto:contact@bowls-time.com" style="color:#1a5276; font-weight:600;">contact@bowls-time.com</a>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0; font-size:14px; color:#666;">If you made this change, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f4; padding:16px 32px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="margin:0; font-size:12px; color:#999;">BowlsTime · contact@bowls-time.com</p>
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
      to: email,
      subject: 'Your BowlsTime password has been changed',
      body: emailBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendPasswordChangeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});