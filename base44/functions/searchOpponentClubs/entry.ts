import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Search the scraped Play Bowls club list (ProspectClub) for opponent clubs.
//
// Authorization: authenticated user who is an approved club admin OR selector
// of the requested club (same model as updateTeamSelection).
//
// Privacy: ProspectClub is the sales CRM — this endpoint returns ONLY
// { id, club_name, address, town, county, postcode }. No emails, phones,
// websites, contact_status, notes or outreach data ever leave this function.
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

// In-memory cache of the slimmed-down club list (~10 minutes, per isolate)
let CACHE = { list: [], loadedAt: 0 };
const CACHE_TTL = 10 * 60 * 1000;

async function loadClubList(base44) {
  if (Date.now() - CACHE.loadedAt < CACHE_TTL) return CACHE.list;
  const all = [];
  let cursor = null;
  let hasMore = true;
  let guard = 0;
  while (hasMore && guard < 100) {
    const page = await base44.asServiceRole.entities.ProspectClub.list(
      cursor ? { limit: 200, cursor } : { limit: 200 }
    );
    const items = page.items || [];
    for (const c of items) {
      all.push({
        id: c.id,
        club_name: c.club_name,
        address: c.address,
        town: c.town,
        county: c.county,
        postcode: c.postcode,
      });
    }
    cursor = page.next_cursor;
    hasMore = !!page.has_more && !!cursor;
    guard++;
  }
  CACHE = { list: all, loadedAt: Date.now() };
  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, query } = await req.json();
    if (!clubId) return Response.json({ error: 'Missing clubId' }, { status: 400 });

    // Club permission check — club admin or selector (or platform admin)
    const platform = isPlatformAdmin(user);
    if (!platform) {
      const membership = await getClubMembership(base44, user.email, clubId);
      if (!membership || (membership.role !== 'admin' && membership.role !== 'selector')) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
    }

    const clubs = await loadClubList(base44);
    if (clubs.length === 0) {
      return Response.json({ results: [], empty: true });
    }

    const trimmed = String(query || '').trim().toLowerCase();
    if (trimmed.length < 2) {
      return Response.json({ results: [], empty: false });
    }

    // Exclude the requesting club's own name
    const clubRec = (await base44.asServiceRole.entities.Club.filter({ id: clubId }))[0];
    const ownName = String(clubRec?.name || '').trim().toLowerCase();

    const words = trimmed.split(/\s+/).filter(Boolean);
    const seen = new Set();
    const scored = [];

    for (const c of clubs) {
      const nameL = String(c.club_name || '').trim().toLowerCase();
      if (!nameL) continue;
      if (nameL === ownName) continue;

      const townL = String(c.town || '').toLowerCase();
      const countyL = String(c.county || '').toLowerCase();
      const postcodeL = String(c.postcode || '').toLowerCase();

      const matches = words.every(w =>
        nameL.includes(w) || townL.includes(w) || countyL.includes(w) || postcodeL.includes(w)
      );
      if (!matches) continue;

      // De-duplicate by club_name + postcode
      const dupKey = `${nameL}|${postcodeL}`;
      if (seen.has(dupKey)) continue;
      seen.add(dupKey);

      let score = 2; // town/county/postcode only
      if (nameL.startsWith(trimmed)) score = 0;
      else if (nameL.includes(trimmed)) score = 1;
      scored.push({ score, club: c });
    }

    scored.sort((a, b) => a.score - b.score);
    return Response.json({ results: scored.slice(0, 20).map(s => s.club) });
  } catch (error) {
    console.error('searchOpponentClubs error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});