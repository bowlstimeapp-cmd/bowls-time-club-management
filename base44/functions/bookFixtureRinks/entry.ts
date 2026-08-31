import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyClubAdmin, verifyBelongsToClub, addHoursToTime, generateSessions } from '../../shared/fixtureHelpers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fixtureId, club_id, rinks } = await req.json();

    if (!fixtureId || !club_id || !rinks || !Array.isArray(rinks) || rinks.length === 0) {
      return Response.json({ error: 'Missing required fields: fixtureId, club_id, rinks' }, { status: 400 });
    }

    if (!await verifyClubAdmin(base44, user, club_id)) {
      return Response.json({ error: 'Forbidden: must be a club admin' }, { status: 403 });
    }

    // Load fixture
    const fixture = await verifyBelongsToClub(base44, 'ClubFixture', fixtureId, club_id);
    if (!fixture) {
      return Response.json({ error: 'Fixture not found or does not belong to this club' }, { status: 404 });
    }

    // Reject if venue is Away — no rink booking needed
    if (fixture.venue === 'Away') {
      return Response.json({ error: 'Cannot book rinks for an Away fixture' }, { status: 400 });
    }

    // Load competition for home_rinks and name
    const competition = await verifyBelongsToClub(base44, 'Competition', fixture.competition_id, club_id);
    if (!competition) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Load club for session configuration
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
    const club = clubs[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    // Calculate end time from finish_time (if set) or start + session_duration
    const startTime = fixture.time;
    const endTime = fixture.finish_time
      ? fixture.finish_time
      : addHoursToTime(startTime, club.session_duration || 2);

    // Generate sessions between start and end time
    const sessions = generateSessions(startTime, endTime, club);
    if (sessions.length === 0) {
      return Response.json({ error: 'No sessions found between start and finish time' }, { status: 400 });
    }

    // Fetch all bookings for this date (own club) for clash detection
    const ownBookings = await base44.asServiceRole.entities.Booking.filter({
      club_id, date: fixture.date,
    });
    const activeOwn = ownBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');

    // Check affiliated clubs for clashes too (same pattern as createBooking)
    const affiliatedIds = Array.isArray(club.affiliated_club_ids) ? club.affiliated_club_ids : [];
    let activeAff = [];
    for (const aid of affiliatedIds) {
      const ab = await base44.asServiceRole.entities.Booking.filter({
        club_id: aid, date: fixture.date,
      });
      activeAff = activeAff.concat(ab.filter(b => b.status !== 'cancelled' && b.status !== 'rejected'));
    }

    // Check if a rink is free for ALL sessions
    function isRinkFree(rink) {
      for (const session of sessions) {
        const ownClash = activeOwn.some(b =>
          b.rink_number === rink && session.start < b.end_time && session.end > b.start_time
        );
        if (ownClash) return false;
        const affClash = activeAff.some(b =>
          b.rink_number === rink && session.start < b.end_time && session.end > b.start_time
        );
        if (affClash) return false;
      }
      return true;
    }

    // Get clash info for a rink (first session with a clash)
    function getClashInfo(rink) {
      for (const session of sessions) {
        const clash = activeOwn.find(b =>
          b.rink_number === rink && session.start < b.end_time && session.end > b.start_time
        ) || activeAff.find(b =>
          b.rink_number === rink && session.start < b.end_time && session.end > b.start_time
        );
        if (clash) return clash;
      }
      return null;
    }

    const allRinkNumbers = Array.from({ length: club.rink_count || 6 }, (_, i) => i + 1);

    // Check each selected rink for clashes
    const clashes = [];
    const freeRinks = [];

    for (const rink of rinks) {
      if (isRinkFree(rink)) {
        freeRinks.push(rink);
      } else {
        const clash = getClashInfo(rink);
        const alternates = allRinkNumbers
          .filter(r => r !== rink && !rinks.includes(r) && isRinkFree(r));

        clashes.push({
          rink,
          clashWith: clash ? {
            booker_name: clash.booker_name,
            start_time: clash.start_time,
            end_time: clash.end_time,
            competition_type: clash.competition_type,
          } : null,
          suggestedAlternates: alternates,
        });
      }
    }

    // If clashes exist, return them without creating any bookings
    if (clashes.length > 0) {
      return Response.json({ success: false, clashes, freeRinks });
    }

    // No clashes — create bookings for each session per rink
    const adminName = user.first_name && user.surname
      ? `${user.first_name} ${user.surname}`
      : (user.full_name || user.email);

    const createdBookings = [];
    for (const rink of rinks) {
      for (const session of sessions) {
        const booking = await base44.asServiceRole.entities.Booking.create({
          club_id,
          rink_number: rink,
          date: fixture.date,
          start_time: session.start,
          end_time: session.end,
          status: 'approved',
          competition_type: 'Club',
          competition_other: competition.name,
          booker_name: adminName,
          booker_email: user.email,
          notes: `${competition.name} fixture`,
          admin_notes: '__fixture__',
        });
        createdBookings.push(booking);
      }
    }

    // Update the associated draft TeamSelection to mark rinks as booked
    const SELECTION_ENUM = ['Bramley', 'Wessex League', 'Denny', 'Top Club'];
    const compNameLower = (competition.name || '').trim().toLowerCase();
    const matchedEnum = SELECTION_ENUM.find(e => e.toLowerCase() === compNameLower);
    if (matchedEnum) {
      const draftSelections = await base44.asServiceRole.entities.TeamSelection.filter({
        club_id, match_date: fixture.date, status: 'draft', competition: matchedEnum,
      });
      if (draftSelections.length > 0) {
        await base44.asServiceRole.entities.TeamSelection.update(draftSelections[0].id, {
          rinks_booked: true,
        });
      }
    }

    return Response.json({ success: true, bookings: createdBookings, sessions });
  } catch (error) {
    console.error('bookFixtureRinks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});