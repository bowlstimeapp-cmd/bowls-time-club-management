import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, clubId, id, ids } = await req.json();

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    // Verify caller is an approved admin or steward of this club (or platform admin)
    const isPlatformAdmin = user?.role === 'admin';
    let isClubPrivileged = false;
    if (!isPlatformAdmin) {
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
        status: 'approved',
      });
      const m = memberships[0];
      isClubPrivileged = m && (m.role === 'admin' || m.role === 'steward');
    }

    if (!isPlatformAdmin && !isClubPrivileged) {
      return Response.json({ error: 'Forbidden: must be a club admin or steward' }, { status: 403 });
    }

    // Helper: verify a booking belongs to this club
    const verifyBooking = async (bookingId) => {
      const records = await base44.asServiceRole.entities.Booking.filter({ id: bookingId });
      const record = records[0];
      if (!record) return null;
      if (record.club_id !== clubId) return null;
      return record;
    };

    // ── CANCEL (soft delete — set status to cancelled) ──────────────────────
    if (action === 'cancel') {
      if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
      const record = await verifyBooking(id);
      if (!record) return Response.json({ error: 'Booking not found or does not belong to this club' }, { status: 404 });
      await base44.asServiceRole.entities.Booking.update(id, { status: 'cancelled' });
      return Response.json({ success: true, booking: record });
    }

    // ── DELETE (hard delete) ────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
      const record = await verifyBooking(id);
      if (!record) return Response.json({ error: 'Booking not found or does not belong to this club' }, { status: 404 });
      await base44.asServiceRole.entities.Booking.delete(id);
      return Response.json({ success: true, booking: record });
    }

    // ── BULK_CANCEL (soft delete multiple) ──────────────────────────────────
    if (action === 'bulk_cancel') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json({ error: 'Missing ids array' }, { status: 400 });
      }
      const bookings = [];
      for (const bid of ids) {
        const record = await verifyBooking(bid);
        if (record) {
          await base44.asServiceRole.entities.Booking.update(bid, { status: 'cancelled' });
          bookings.push(record);
        }
      }
      return Response.json({ success: true, cancelled: bookings.length, bookings });
    }

    // ── BULK_DELETE (hard delete multiple) ──────────────────────────────────
    if (action === 'bulk_delete') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json({ error: 'Missing ids array' }, { status: 400 });
      }
      const bookings = [];
      for (const bid of ids) {
        const record = await verifyBooking(bid);
        if (record) {
          await base44.asServiceRole.entities.Booking.delete(bid);
          bookings.push(record);
        }
      }
      return Response.json({ success: true, deleted: bookings.length, bookings });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageBooking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});