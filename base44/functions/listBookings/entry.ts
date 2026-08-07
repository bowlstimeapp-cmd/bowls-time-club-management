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

    // Build filter — use exact match filters when possible
    const filter = { club_id: clubId };
    if (date) filter.date = date;
    if (status) filter.status = status;
    if (booker_email) filter.booker_email = booker_email;

    let bookings;

    if (date_from || date_to) {
      // Date range query — fetch all club bookings and filter by range
      bookings = await base44.asServiceRole.entities.Booking.filter({ club_id: clubId });
      if (date_from) bookings = bookings.filter(b => b.date >= date_from);
      if (date_to) bookings = bookings.filter(b => b.date <= date_to);
      if (status) bookings = bookings.filter(b => b.status === status);
      if (booker_email) bookings = bookings.filter(b => b.booker_email === booker_email);
      if (date) bookings = bookings.filter(b => b.date === date);
    } else {
      bookings = await base44.asServiceRole.entities.Booking.filter(filter);
    }

    // Sort by created_date descending (newest first) for consistent ordering
    bookings.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    return Response.json({ bookings });
  } catch (error) {
    console.error('listBookings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});