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

/**
 * Secure backend function for TeamSelection create / update / delete.
 * 
 * Authorization model:
 *   create / update — club admin OR club selector (ClubMembership.role)
 *   delete          — club admin only
 *   publish         — club admin or selector
 * 
 * NOTE: RLS on TeamSelection uses user_condition role checks which only look at
 * the global Users.role. This function bypasses that via asServiceRole after
 * verifying the correct ClubMembership.role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, clubId, selectionId, data } = await req.json();

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    const platform = isPlatformAdmin(user);
    const membership = platform ? null : await getClubMembership(base44, user.email, clubId);
    const memberRole = membership?.role;

    const isAdminLevel = platform || memberRole === 'admin';
    const isSelectorLevel = isAdminLevel || memberRole === 'selector';

    if (action === 'create') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!data) return Response.json({ error: 'Missing data for create' }, { status: 400 });
      const created = await base44.asServiceRole.entities.TeamSelection.create({ ...data, club_id: clubId });
      return Response.json({ success: true, id: created.id, record: created });
    }

    if (action === 'update') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!selectionId || !data) return Response.json({ error: 'Missing selectionId or data' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.update(selectionId, data);
      return Response.json({ success: true });
    }

    if (action === 'move_bookings') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      const { oldRinks, newRinks, bookingDate, startTime, endTime } = data || {};
      if (!selectionId || !Array.isArray(oldRinks) || !Array.isArray(newRinks)) {
        return Response.json({ error: 'Missing selectionId, oldRinks or newRinks' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      const date = bookingDate || existing[0].match_date;
      const start = startTime || existing[0].match_start_time;
      const end = endTime || existing[0].match_end_time || start;
      if (!date || !start) {
        return Response.json({ success: true, moved: 0, cancelled: 0, blocked: [] });
      }

      const oldSet = new Set(oldRinks.map(Number));
      const dayBookings = await base44.asServiceRole.entities.Booking.filter({ club_id: clubId, date });

      // Bookings created for this match by the app (Selection Editor "Book Rinks"
      // or the Fixtures module), still active, on a previously selected rink,
      // starting within the match window.
      const linked = dayBookings.filter(b =>
        (b.admin_notes === '__selection__' || b.admin_notes === '__fixture__') &&
        b.status !== 'cancelled' && b.status !== 'rejected' &&
        oldSet.has(b.rink_number) &&
        b.start_time >= start && b.start_time < end
      );
      if (linked.length === 0) {
        return Response.json({ success: true, moved: 0, cancelled: 0, blocked: [] });
      }

      // Positional mapping: sorted old rinks -> sorted new rinks. Old rinks with
      // no corresponding new rink (rink count reduced) get their bookings cancelled.
      const oldSorted = [...oldSet].sort((a, b) => a - b);
      const newSorted = [...new Set(newRinks.map(Number))].filter(n => !isNaN(n)).sort((a, b) => a - b);
      const rinkMap = new Map();
      oldSorted.forEach((r, i) => rinkMap.set(r, i < newSorted.length ? newSorted[i] : null));

      const active = dayBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');
      const movedIds = new Set();
      let moved = 0, cancelled = 0;
      const blocked = [];
      for (const b of linked) {
        const target = rinkMap.get(Number(b.rink_number));
        if (target === undefined || target === b.rink_number) continue;
        if (target === null) {
          await base44.asServiceRole.entities.Booking.update(b.id, { status: 'cancelled' });
          movedIds.add(b.id);
          cancelled++;
          continue;
        }
        // Target rink must be free for this booking's time slot
        const clash = active.find(x =>
          x.id !== b.id && !movedIds.has(x.id) &&
          x.rink_number === target &&
          x.start_time < (b.end_time || end) && (x.end_time || end) > b.start_time
        );
        if (clash) { blocked.push({ from: b.rink_number, to: target }); continue; }
        await base44.asServiceRole.entities.Booking.update(b.id, { rink_number: target });
        movedIds.add(b.id);
        moved++;
      }
      return Response.json({ success: true, moved, cancelled, blocked });
    }

    if (action === 'delete') {
      if (!isAdminLevel) {
        return Response.json({ error: 'Forbidden: only club admins can delete selections' }, { status: 403 });
      }
      if (!selectionId) return Response.json({ error: 'Missing selectionId' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.delete(selectionId);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('updateTeamSelection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});