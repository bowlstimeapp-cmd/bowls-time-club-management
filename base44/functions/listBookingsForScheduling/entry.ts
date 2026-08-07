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

    const { clubId, dates, booker_name } = await req.json();
    if (!clubId) return Response.json({ error: 'clubId is required' }, { status: 400 });

    const hasDates = dates && Array.isArray(dates) && dates.length > 0;
    const hasBookerName = !!booker_name;
    if (!hasDates && !hasBookerName) {
      return Response.json({ error: 'dates or booker_name is required' }, { status: 400 });
    }

    // Verify the caller is a club admin or selector (or platform admin).
    // This is a stricter use case than listBookings — only admins and selectors
    // need the full scheduling picture for clash detection.
    if (!isPlatformAdmin(user)) {
      const membership = await getClubMembership(base44, user.email, clubId);
      if (!membership || !['admin', 'selector'].includes(membership.role)) {
        return Response.json({ error: 'Forbidden: requires admin or selector role' }, { status: 403 });
      }
    }

    // Fetch all bookings for the club, then filter by dates and/or booker_name.
    // Do NOT filter out cancelled/rejected — League Admin needs the full picture
    // to detect clashes.
    let bookings = await base44.asServiceRole.entities.Booking.filter({ club_id: clubId });
    if (hasDates) {
      const dateSet = new Set(dates);
      bookings = bookings.filter(b => dateSet.has(b.date));
    }
    if (booker_name) {
      bookings = bookings.filter(b => b.booker_name === booker_name);
    }

    return Response.json({ bookings });
  } catch (error) {
    console.error('listBookingsForScheduling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});