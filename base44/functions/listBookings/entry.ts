import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Auth helpers (inlined — no local imports in Deno Deploy)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clubId, date, date_from, date_to, status, booker_email } = await req.json();
    if (!clubId) return Response.json({ error: 'clubId is required' }, { status: 400 });

    // Verify the caller is an approved member of this club (any role).
    // This matches how the physical rink-booking board works today — any club
    // member can see the club's bookings.
    if (!isPlatformAdmin(user)) {
      const membership = await getClubMembership(base44, user.email, clubId);
      if (!membership) {
        return Response.json({ error: 'Forbidden: not an approved member of this club' }, { status: 403 });
      }
    }

    // Fetch the club to get its affiliated_club_ids (shared-rink visibility)
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
    const club = clubs[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const affiliatedIds = Array.isArray(club.affiliated_club_ids) ? club.affiliated_club_ids : [];

    // Build a club-name map for tagging (own club + all affiliated clubs)
    const clubNames = new Map();
    clubNames.set(clubId, club.name || 'Unknown');
    for (const aid of affiliatedIds) {
      if (!clubNames.has(aid)) {
        try {
          const ac = await base44.asServiceRole.entities.Club.filter({ id: aid });
          if (ac[0]) clubNames.set(aid, ac[0].name || 'Unknown');
        } catch { /* ignore lookup failures */ }
      }
    }

    // All club IDs to fetch bookings for: own club + affiliated clubs
    const allClubIds = [clubId, ...affiliatedIds];

    // Fetch bookings for a single club applying the same filters
    const fetchClubBookings = async (cid) => {
      const filter = { club_id: cid };
      if (date) filter.date = date;
      if (status) filter.status = status;
      if (booker_email) filter.booker_email = booker_email;

      if (date_from || date_to) {
        let result = await base44.asServiceRole.entities.Booking.filter({ club_id: cid });
        if (date_from) result = result.filter(b => b.date >= date_from);
        if (date_to) result = result.filter(b => b.date <= date_to);
        if (status) result = result.filter(b => b.status === status);
        if (booker_email) result = result.filter(b => b.booker_email === booker_email);
        if (date) result = result.filter(b => b.date === date);
        return result;
      }

      return await base44.asServiceRole.entities.Booking.filter(filter);
    };

    // Fetch and merge bookings from own + affiliated clubs, tagging each with owning club name
    let allBookings = [];
    for (const cid of allClubIds) {
      const cidBookings = await fetchClubBookings(cid);
      const isAffiliated = cid !== clubId;
      for (const b of cidBookings) {
        allBookings.push({
          ...b,
          club_name: clubNames.get(cid) || 'Unknown',
          affiliated_club_id: isAffiliated ? cid : null,
        });
      }
    }

    // Sort by created_date descending (newest first) for consistent ordering
    allBookings.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    return Response.json({ bookings: allBookings });
  } catch (error) {
    console.error('listBookings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});