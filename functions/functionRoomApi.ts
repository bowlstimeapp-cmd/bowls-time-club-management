import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Public REST API for function room availability and booking.
 * Protected by a per-club API key stored on the Club record (function_room_api_key).
 *
 * Routes (all via POST body with a "route" field):
 *   check_availability  — { route, club_id, api_key, room_id?, date, start_time, duration_hours }
 *   submit_booking      — { route, club_id, api_key, room_id, date, start_time, duration_hours,
 *                           contact_name, contact_email, contact_phone?, organisation?, purpose?, attendees? }
 */

function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + hours * 60;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

Deno.serve(async (req) => {
  // CORS headers for public access
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const base44 = createClientFromRequest(req);

  // ── GET /rooms?club_id=xxx ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const club_id = url.searchParams.get('club_id');
    const authHeader = req.headers.get('Authorization') || '';
    const api_key = authHeader.startsWith('ApiKey ') ? authHeader.slice(7) : null;

    if (!club_id) {
      return Response.json({ error: 'Missing required query parameter: club_id' }, { status: 400, headers: corsHeaders });
    }
    if (!api_key) {
      return Response.json({ error: 'Missing required header: Authorization: ApiKey YOUR_KEY' }, { status: 401, headers: corsHeaders });
    }

    const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
    const club = clubs[0];
    if (!club) {
      return Response.json({ error: 'Club not found' }, { status: 404, headers: corsHeaders });
    }
    if (!club.function_room_api_key || club.function_room_api_key !== api_key) {
      return Response.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders });
    }
    if (!club.module_function_rooms) {
      return Response.json({ error: 'Function room module not enabled for this club' }, { status: 403, headers: corsHeaders });
    }

    const rooms = await base44.asServiceRole.entities.FunctionRoom.filter({ club_id, is_active: true });

    const publicRooms = rooms.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || null,
      capacity: r.capacity || null,
      price_per_hour: r.price_per_hour || null,
      available_from: r.available_from || null,
      available_to: r.available_to || null,
    }));

    return Response.json({ rooms: publicRooms }, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const { route, club_id } = body;
  const authHeader = req.headers.get('Authorization') || '';
  const api_key = authHeader.startsWith('ApiKey ') ? authHeader.slice(7) : null;

  if (!api_key) {
    return Response.json({ error: 'Missing required header: Authorization: ApiKey YOUR_KEY' }, { status: 401, headers: corsHeaders });
  }
  if (!route || !club_id) {
    return Response.json({ error: 'Missing required fields: route, club_id' }, { status: 400, headers: corsHeaders });
  }

  // Validate the API key against the club record
  const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
  const club = clubs[0];
  if (!club) {
    return Response.json({ error: 'Club not found' }, { status: 404, headers: corsHeaders });
  }
  if (!club.function_room_api_key || club.function_room_api_key !== api_key) {
    return Response.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders });
  }
  if (!club.module_function_rooms) {
    return Response.json({ error: 'Function room module not enabled for this club' }, { status: 403, headers: corsHeaders });
  }

  // ── CHECK AVAILABILITY ──────────────────────────────────────────────────────
  if (route === 'check_availability') {
    const { date, start_time, duration_hours, room_id } = body;
    if (!date || !start_time || !duration_hours) {
      return Response.json({ error: 'Missing required fields: date, start_time, duration_hours' }, { status: 400, headers: corsHeaders });
    }

    // Get all active rooms for this club (or specific room if provided)
    let rooms = await base44.asServiceRole.entities.FunctionRoom.filter({ club_id, is_active: true });
    if (room_id) {
      rooms = rooms.filter(r => r.id === room_id);
    }

    // Get all approved/pending bookings on that date
    const existingBookings = await base44.asServiceRole.entities.FunctionRoomBooking.filter({ club_id, date });
    const conflictingBookings = existingBookings.filter(b => b.status === 'approved' || b.status === 'pending');

    const requestedEnd = addHours(start_time, Number(duration_hours));

    const availability = rooms.map(room => {
      const roomConflicts = conflictingBookings.filter(b => b.room_id === room.id);
      const isAvailable = !roomConflicts.some(b => timesOverlap(start_time, requestedEnd, b.start_time, b.end_time));

      // Check room operating hours
      let withinHours = true;
      if (room.available_from && start_time < room.available_from) withinHours = false;
      if (room.available_to && requestedEnd > room.available_to) withinHours = false;

      return {
        room_id: room.id,
        room_name: room.name,
        description: room.description || null,
        capacity: room.capacity || null,
        available: isAvailable && withinHours,
      };
    });

    return Response.json({ date, start_time, duration_hours, availability }, { headers: corsHeaders });
  }

  // ── SUBMIT BOOKING ──────────────────────────────────────────────────────────
  if (route === 'submit_booking') {
    const {
      room_id, date, start_time, duration_hours,
      contact_name, contact_email, contact_phone,
      organisation, purpose, attendees
    } = body;

    if (!room_id || !date || !start_time || !duration_hours || !contact_name || !contact_email) {
      return Response.json({ error: 'Missing required fields: room_id, date, start_time, duration_hours, contact_name, contact_email' }, { status: 400, headers: corsHeaders });
    }

    // Validate room exists and is active
    const rooms = await base44.asServiceRole.entities.FunctionRoom.filter({ club_id, id: room_id });
    const room = rooms.find(r => r.id === room_id && r.is_active);
    if (!room) {
      return Response.json({ error: 'Room not found or not available' }, { status: 404, headers: corsHeaders });
    }

    const end_time = addHours(start_time, Number(duration_hours));

    // Check for conflicts
    const existingBookings = await base44.asServiceRole.entities.FunctionRoomBooking.filter({ club_id, room_id, date });
    const hasConflict = existingBookings
      .filter(b => b.status === 'approved' || b.status === 'pending')
      .some(b => timesOverlap(start_time, end_time, b.start_time, b.end_time));

    if (hasConflict) {
      return Response.json({ error: 'The requested time slot is not available' }, { status: 409, headers: corsHeaders });
    }

    // Validate operating hours
    if (room.available_from && start_time < room.available_from) {
      return Response.json({ error: `Room is not available before ${room.available_from}` }, { status: 400, headers: corsHeaders });
    }
    if (room.available_to && end_time > room.available_to) {
      return Response.json({ error: `Room is not available after ${room.available_to}` }, { status: 400, headers: corsHeaders });
    }

    const status = room.auto_approve ? 'approved' : 'pending';

    const booking = await base44.asServiceRole.entities.FunctionRoomBooking.create({
      club_id,
      room_id,
      room_name: room.name,
      date,
      start_time,
      duration_hours: Number(duration_hours),
      end_time,
      status,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      organisation: organisation || null,
      purpose: purpose || null,
      attendees: attendees ? Number(attendees) : null,
      source: 'api',
    });

    return Response.json({
      booking_id: booking.id,
      status,
      message: status === 'approved'
        ? 'Your booking has been confirmed.'
        : 'Your booking request has been received and is pending approval.',
    }, { status: 201, headers: corsHeaders });
  }

  return Response.json({ error: `Unknown route: ${route}` }, { status: 400, headers: corsHeaders });
});