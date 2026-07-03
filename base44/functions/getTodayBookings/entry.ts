import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { club_id } = await req.json();
    if (!club_id) return Response.json({ error: 'club_id is required' }, { status: 400 });

    // Verify the user is a secretary (or admin) of this club
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id, user_email: user.email, status: 'approved'
    });
    const membership = memberships[0];
    if (!membership || !['secretary', 'admin'].includes(membership.role)) {
      return Response.json({ error: 'Forbidden — secretary role required' }, { status: 403 });
    }

    // Today's date in Europe/London timezone
    const now = new Date();
    const londonDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    const bookings = await base44.asServiceRole.entities.Booking.filter({
      club_id, date: londonDate
    });

    const filtered = bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    return Response.json({
      date: londonDate,
      bookings: filtered.map(b => ({
        id: b.id,
        rink_number: b.rink_number,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        booker_name: b.booker_name,
        competition_type: b.competition_type,
        competition_other: b.competition_other,
        booking_format: b.booking_format,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});