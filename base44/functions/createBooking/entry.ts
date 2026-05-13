import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { club_id, rink_number, date, start_time, end_time, competition_type, competition_other, booking_format, notes, rollup_members, booker_name, booker_email } = body;

    if (!club_id || !rink_number || !date || !start_time || !end_time) {
      return Response.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    // Verify the caller is an approved member of this club
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership) {
      return Response.json({ error: 'Forbidden: not an approved member of this club' }, { status: 403 });
    }

    // Fetch club to check auto_approve_bookings
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
    const club = clubs[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    // Determine booker identity — always the authenticated user (or the name they provided for display)
    // IMPORTANT: booker_email is ALWAYS forced to the authenticated user — it cannot be spoofed
    const isKioskAccount = club.kiosk_mode_enabled && club.kiosk_account_email && user.email === club.kiosk_account_email;

    // For kiosk accounts, allow the submitted booker_email (must be a club member) — otherwise force to user.email
    let finalBookerEmail = user.email;
    let finalBookerName = booker_name || user.full_name || user.email;

    if (isKioskAccount && booker_email && booker_email !== user.email) {
      // Verify the kiosk member is actually a member of this club
      const kioskMemberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id,
        user_email: booker_email,
        status: 'approved',
      });
      if (!kioskMemberships[0]) {
        return Response.json({ error: 'Forbidden: kiosk booker is not a member of this club' }, { status: 403 });
      }
      finalBookerEmail = booker_email;
      finalBookerName = booker_name || kioskMemberships[0].user_name || booker_email;
    }

    // Status: admins/stewards/selectors can create as approved; regular members always get pending (unless auto_approve)
    const isPrivileged = membership.role === 'admin' || membership.role === 'steward' || membership.role === 'selector';
    const status = (club.auto_approve_bookings || isPrivileged) ? 'approved' : 'pending';

    const booking = await base44.asServiceRole.entities.Booking.create({
      club_id,
      rink_number,
      date,
      start_time,
      end_time,
      status,
      competition_type: competition_type || null,
      competition_other: competition_other || '',
      booking_format: booking_format || null,
      booker_name: finalBookerName,
      booker_email: finalBookerEmail,
      notes: notes || '',
      rollup_members: rollup_members || [],
    });

    return Response.json({ success: true, booking });
  } catch (error) {
    console.error('createBooking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});