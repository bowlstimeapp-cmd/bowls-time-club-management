import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { clubIds } = await req.json();
    if (!clubIds || !Array.isArray(clubIds) || clubIds.length === 0) {
      return Response.json({ error: 'clubIds array required' }, { status: 400 });
    }
    if (clubIds.length > 10) {
      return Response.json({ error: 'Max 10 clubs per batch' }, { status: 400 });
    }

    // Fetch the clubs
    const clubs = await Promise.all(
      clubIds.map((id: string) => base44.asServiceRole.entities.ProspectClub.get(id))
    );

    // Process each club in parallel
    const results = await Promise.allSettled(
      clubs.map((club) => enrichClub(club, base44))
    );

    const summary = results.map((r, i) => ({
      club_name: clubs[i].club_name,
      status: r.status,
      ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
    }));

    return Response.json({ results: summary });
  } catch (error) {
    console.error('enrichProspectContacts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BowlsTime/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  // Extract from mailto: links (most reliable)
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  for (const m of html.matchAll(mailtoRegex)) {
    const cleaned = m[1].toLowerCase().replace(/^u003[ce]/, '');
    if (!cleaned.includes('playbowls@bowlsengland') && !cleaned.includes('enquiries@bowlsengland')) {
      emails.add(cleaned);
    }
  }

  // Extract from text
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const textMatches = html.match(emailRegex) || [];
  for (const e of textMatches) {
    const lower = e.toLowerCase();
    // Strip HTML entity artifacts (u003e = >, u003c = <, etc.)
    const cleaned = lower.replace(/^u003[ce]/, '');
    if (cleaned.includes('sentry.io') || cleaned.includes('googleapis') || cleaned.includes('wixpress') ||
        cleaned.includes('cloudflare') || cleaned.includes('example.com') || cleaned.includes('.png') ||
        cleaned.includes('.jpg') || cleaned.includes('.js') || cleaned.includes('.css') ||
        cleaned.includes('noreply') || cleaned.includes('no-reply') || cleaned.includes('donotreply') ||
        cleaned.includes('schema.org') || cleaned.includes('fonts.') ||
        cleaned.includes('playbowls@bowlsengland') || cleaned.includes('enquiries@bowlsengland') ||
        cleaned.includes('webmaster@play-bowls') || cleaned.includes('info@play-bowls')) continue;
    emails.add(cleaned);
  }

  return [...emails];
}

function extractContactName(html: string): string | null {
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ');

  const patterns = [
    /(?:hon\.?\s*sec(?:retary)?|honorary\s+secretary)\s*[:\-,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /(?:secretary)\s*[:\-,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /(?:contact)\s*[:\-,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /(?:president|chairman|captain|treasurer)\s*[:\-,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
  ];

  const blocklist = ['customer support', 'webmaster', 'info', 'admin', 'administrator', 'contact us',
    'general enquiries', 'membership secretary', 'club secretary', 'club manager', 'site admin',
    'website manager', 'technical support', 'customer service', 'office manager'];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (!blocklist.includes(name.toLowerCase())) return name;
    }
  }

  return null;
}

function findEmailNearKeyword(html: string, keyword: string): string | null {
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  const regex = new RegExp(keyword + '[\\s\\S]{0,300}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})', 'i');
  const match = cleaned.match(regex);
  return match ? match[1].toLowerCase() : null;
}

function cleanHtmlForText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ');
}

async function enrichClub(club: any, base44: any): Promise<{ club_name: string; contact_name: string | null; emails: string[]; source: string }> {
  let allEmails: string[] = [];
  let contactName: string | null = null;
  let secretaryEmail: string | null = null;
  let sources: string[] = [];

  // Try fetching the club's website
  if (club.website) {
    let url = club.website;
    if (!url.startsWith('http')) url = 'https://' + url;
    const html = await fetchWithTimeout(url);
    if (html) {
      const emails = extractEmails(html);
      const newEmails = emails.filter(e => !allEmails.includes(e));
      allEmails.push(...newEmails);

      const name = extractContactName(html);
      if (name) {
        contactName = name;
        secretaryEmail = findEmailNearKeyword(html, 'secretary');
        sources.push('website');
      }
      if (newEmails.length > 0 && !sources.includes('website')) sources.push('website');
    }
  }

  // Try fetching play_bowls_url
  if (club.play_bowls_url) {
    let url = club.play_bowls_url;
    if (!url.startsWith('http')) url = 'https://' + url;
    const html = await fetchWithTimeout(url);
    if (html) {
      const emails = extractEmails(html);
      const newEmails = emails.filter(e => !allEmails.includes(e));
      allEmails.push(...newEmails);

      if (!contactName) {
        const name = extractContactName(html);
        if (name) {
          contactName = name;
          secretaryEmail = findEmailNearKeyword(html, 'secretary');
          sources.push('play-bowls');
        }
      }
      if (newEmails.length > 0 && !sources.includes('play-bowls')) sources.push('play-bowls');
    }
  }

  // Build update data
  const updateData: Record<string, any> = {
    all_emails: allEmails,
    enriched: true,
  };

  if (contactName) updateData.contact_name = contactName;

  // Set the best email: secretary email if found, else first email
  const bestEmail = secretaryEmail || allEmails[0] || '';
  if (allEmails.length > 0) {
    updateData.website_email = allEmails[0];
    if (!club.email) updateData.email = bestEmail;
  }

  await base44.asServiceRole.entities.ProspectClub.update(club.id, updateData);

  return {
    club_name: club.club_name,
    contact_name: contactName,
    emails: allEmails,
    source: sources.join(', ') || 'no-data-found',
  };
}