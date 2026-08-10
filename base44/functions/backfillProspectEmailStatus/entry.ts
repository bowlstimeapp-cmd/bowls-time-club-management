import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Fetch all ProspectClub records
    const allProspects = await base44.asServiceRole.entities.ProspectClub.filter({}, '-created_date', 1000);

    // 2. Build email -> prospect map (case-insensitive across all email fields)
    const emailMap = new Map();
    for (const prospect of allProspects) {
      const emails = [
        prospect.email,
        prospect.primary_email,
        prospect.final_recommended_email,
        prospect.website_email,
        prospect.directory_email,
        prospect.where_to_find_us_email,
        ...(prospect.all_emails || []),
      ].filter(Boolean);
      for (const email of emails) {
        const lower = email.toLowerCase().trim();
        if (lower && !emailMap.has(lower)) {
          emailMap.set(lower, prospect);
        }
      }
    }

    // 3. Paginate through Resend's send history
    let allEntries = [];
    let after = null;
    let pagesFetched = 0;
    let hasMore = true;
    const MAX_PAGES = 50;

    while (hasMore && pagesFetched < MAX_PAGES) {
      const url = new URL('https://api.resend.com/emails');
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secrets.get('Resend_API')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Resend list error:', errText);
        return Response.json({ error: `Resend error: ${errText}` }, { status: 502 });
      }

      const data = await res.json();

      // Log the raw shape of the first page for debugging
      if (pagesFetched === 0) {
        console.log('Resend list response keys:', Object.keys(data));
        if (data.data?.[0]) {
          console.log('First entry keys:', Object.keys(data.data[0]));
          console.log('First entry sample:', JSON.stringify(data.data[0]).substring(0, 800));
        }
      }

      pagesFetched++;
      const entries = data.data || [];
      allEntries = allEntries.concat(entries);

      if (data.has_more && data.last_id) {
        after = data.last_id;
      } else {
        hasMore = false;
      }
    }

    // 4. Match entries to prospects, keeping the most recent entry per prospect
    const prospectUpdates = new Map();
    let matched = 0;
    let unmatched = 0;

    for (const entry of allEntries) {
      let entryMatched = false;
      const recipients = entry.to || [];
      const toAddresses = Array.isArray(recipients) ? recipients : [recipients];

      for (const addr of toAddresses) {
        const email = typeof addr === 'string' ? addr : addr?.email || addr?.address;
        if (!email) continue;
        const lower = email.toLowerCase().trim();
        const prospect = emailMap.get(lower);
        if (!prospect) continue;

        entryMatched = true;
        const entryTime = entry.created_at || '';
        const existing = prospectUpdates.get(prospect.id);
        if (!existing || entryTime > existing.created_at) {
          prospectUpdates.set(prospect.id, {
            resend_email_id: entry.id,
            email_status: entry.last_event || entry.status || 'unknown',
            created_at: entryTime,
          });
        }
      }

      if (entryMatched) {
        matched++;
      } else {
        unmatched++;
      }
    }

    // 5. Batch update matched prospects
    const now = new Date().toISOString();
    const updateRecords = Array.from(prospectUpdates.entries()).map(([prospectId, update]) => ({
      id: prospectId,
      resend_email_id: update.resend_email_id,
      email_status: update.email_status,
      email_status_checked_at: now,
    }));

    let prospectsUpdated = 0;
    for (let i = 0; i < updateRecords.length; i += 500) {
      const batch = updateRecords.slice(i, i + 500);
      await base44.asServiceRole.entities.ProspectClub.bulkUpdate(batch);
      prospectsUpdated += batch.length;
    }

    return Response.json({
      totalResendEntries: allEntries.length,
      matched,
      unmatched,
      prospectsUpdated,
      pagesFetched,
    });
  } catch (error) {
    console.error('backfillProspectEmailStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}