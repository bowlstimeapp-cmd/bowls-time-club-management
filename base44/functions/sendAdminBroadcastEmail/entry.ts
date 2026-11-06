import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Sends one individual email per recipient (no BCC, no shared "to").
// - testOnly: true  -> one merged email, addressed only to the signed-in platform admin, subject prefixed "[TEST] "
// - testOnly: false -> one merged email per recipient, sent via Resend's batch endpoint in chunks of 50

const FROM = 'BowlsTime <contact@bowls-time.com>';
const EMAIL_REGEX = /^[^\s]+@[^\s@]+\.[^\s@]+$/;
const BATCH_LIMIT = 50;
const CHUNK_DELAY_MS = 600;
const RETRY_429_DELAY_MS = 1500;

const SAMPLE_RECIPIENT = {
  email: '',
  first_name: 'Jane',
  name: 'Jane Smith',
  club_names: ['Example Bowls Club'],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const joinNaturally = (names: string[]) => {
  const list = (Array.isArray(names) ? names : []).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

const mergeValues = (recipient: any) => {
  const r = recipient || SAMPLE_RECIPIENT;
  const fullName = String(r?.name || '').trim();
  const firstName = String(r?.first_name || '').trim() || fullName.split(/\s+/)[0] || 'there';
  return {
    first_name: firstName,
    admin_name: fullName || firstName || 'there',
    club_name: joinNaturally(r?.club_names) || 'your club',
  };
};

// Case-insensitive, tolerates spaces inside the braces, leaves unknown tags untouched
const mergeTags = (text: string, values: Record<string, string>, escape: boolean) =>
  String(text || '').replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, tag) => {
    const key = String(tag).toLowerCase();
    if (!(key in values)) return match;
    return escape ? escapeHtml(values[key]) : values[key];
  });

const nl2brSafe = (str: string) =>
  str
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith('<') && part.endsWith('>') ? part : part.replace(/\n/g, '<br/>')))
    .join('');

const buildShell = (innerHtml: string) => `
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
              ${nl2brSafe(innerHtml)}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f4; padding:16px 32px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="margin:0; font-size:12px; color:#999;">BowlsTime &middot; contact@bowls-time.com</p>
              <p style="margin:6px 0 0; font-size:12px; color:#999;">You are receiving this email because you are a Club Admin on BowlsTime.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { subject, body, recipients, testOnly } = await req.json();
    if (!subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ---- Validate / de-duplicate recipients ----
    const seen = new Set<string>();
    const clean: Array<{ email: string; first_name: string; name: string; club_names: string[] }> = [];
    const invalidAddresses: string[] = [];

    for (const raw of Array.isArray(recipients) ? recipients : []) {
      const email = String(raw?.email || '').trim();
      const key = email.toLowerCase();
      if (!EMAIL_REGEX.test(email) || email.startsWith('.')) {
        if (email) invalidAddresses.push(email);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push({
        email,
        first_name: String(raw?.first_name || '').trim(),
        name: String(raw?.name || '').trim(),
        club_names: Array.isArray(raw?.club_names) ? raw.club_names.map((n: any) => String(n)).filter(Boolean) : [],
      });
    }

    const isTest = testOnly === true;
    if (!isTest && clean.length === 0) {
      return Response.json({ error: 'No valid recipients' }, { status: 400 });
    }

    const headers = {
      'Authorization': `Bearer ${secrets.get('Resend_API')}`,
      'Content-Type': 'application/json',
    };

    const trimmedBody = String(body).trim();
    const isFullHtml = /^<!DOCTYPE html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);

    // Build one fully merged email (subject + html) for a recipient
    const buildEmail = (recipient: any) => {
      const values = mergeValues(recipient);
      const mergedSubject = mergeTags(subject, values, false);
      const mergedBody = mergeTags(body, values, true);
      const html = isFullHtml ? mergedBody : buildShell(mergedBody);
      return { subject: mergedSubject, html };
    };

    const sendSingle = async (to: string, email: { subject: string; html: string }) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({ from: FROM, to: [to], subject: email.subject, html: email.html }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend error: ${errText}`);
      }
      const data = await res.json();
      return data?.id || null;
    };

    // ---- Test send ----
    if (isTest) {
      const email = buildEmail(clean[0] || SAMPLE_RECIPIENT);
      const id = await sendSingle(user.email, { ...email, subject: `[TEST] ${email.subject}` });
      return Response.json({
        success: true,
        totalRecipients: 1,
        sentCount: 1,
        failedCount: 0,
        results: [{ email: user.email, status: 'sent', resend_email_id: id, error: null }],
        invalidAddresses,
        testOnly: true,
      });
    }

    // ---- Live send ----
    const results: Array<{ email: string; status: 'sent' | 'failed'; resend_email_id?: string | null; error?: string | null }> = [];

    for (let i = 0; i < clean.length; i += BATCH_LIMIT) {
      const chunk = clean.slice(i, i + BATCH_LIMIT);
      const prepared = chunk.map((r) => ({ email: r.email, ...buildEmail(r) }));

      let batchIds: any[] | null = null;
      try {
        const payload = prepared.map((p) => ({ from: FROM, to: [p.email], subject: p.subject, html: p.html }));
        let res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.status === 429) {
          await sleep(RETRY_429_DELAY_MS);
          res = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) {
          const errText = await res.text();
          console.error('Resend batch error:', errText);
          throw new Error(`Resend error: ${errText}`);
        }
        const data = await res.json();
        batchIds = Array.isArray(data?.data) ? data.data : [];
      } catch (batchError: any) {
        console.warn('Batch send failed, falling back to individual sends:', batchError?.message || batchError);
        batchIds = null;
      }

      if (batchIds) {
        prepared.forEach((p, idx) => {
          results.push({ email: p.email, status: 'sent', resend_email_id: batchIds?.[idx]?.id || null, error: null });
        });
      } else {
        for (const p of prepared) {
          try {
            const id = await sendSingle(p.email, p);
            results.push({ email: p.email, status: 'sent', resend_email_id: id, error: null });
          } catch (sendError: any) {
            results.push({ email: p.email, status: 'failed', resend_email_id: null, error: String(sendError?.message || sendError) });
          }
          await sleep(200);
        }
      }

      if (i + BATCH_LIMIT < clean.length) await sleep(CHUNK_DELAY_MS);
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    return Response.json({
      success: failedCount === 0,
      totalRecipients: clean.length,
      sentCount,
      failedCount,
      results,
      invalidAddresses,
    });
  } catch (error: any) {
    console.error('sendAdminBroadcastEmail error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}