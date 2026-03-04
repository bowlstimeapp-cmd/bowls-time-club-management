import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // play-bowls.com loads clubs dynamically via API - attempt known endpoint patterns
    const endpoints = [
      'https://play-bowls.com/api/clubs',
      'https://play-bowls.com/api/findclub',
      'https://api.play-bowls.com/clubs',
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; BowlsTime/1.0)',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const clubs = Array.isArray(data) ? data : (data.clubs || data.results || data.data || []);
          if (clubs.length > 0) {
            const mapped = clubs.map(c => ({
              club_name: c.name || c.club_name || c.title || '',
              address: [c.address, c.address_line_1, c.street].filter(Boolean).join(', '),
              county: c.county || c.region || c.city || '',
              email: c.email || c.contact_email || '',
              phone: c.phone || c.telephone || c.contact_phone || '',
              website: c.website || c.url || c.web || '',
              contact_name: c.contact_name || c.contact || '',
              source: 'play-bowls.com',
              contact_status: 'not_contacted',
            })).filter(c => c.club_name);
            return Response.json({ clubs: mapped, source: url });
          }
        }
      } catch (_) {
        // try next endpoint
      }
    }

    // The site uses client-side rendering — clubs can't be scraped server-side without the API key
    return Response.json({ clubs: [], message: 'play-bowls.com uses a dynamic API that requires authentication. Please export club data manually from the site and import via CSV.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});