import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch ALL bookings in paginated batches
    let allBookings: any[] = [];
    let skip = 0;
    const batchSize = 5000;
    while (true) {
      const batch = await base44.asServiceRole.entities.Booking.filter({}, '-created_date', batchSize, skip);
      allBookings = allBookings.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    // Group by club_id + rink_number + date + start_time + end_time
    const groups: Record<string, any[]> = {};
    for (const b of allBookings) {
      const key = `${b.club_id}|${b.rink_number}|${b.date}|${b.start_time}|${b.end_time}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    }

    const statusPriority: Record<string, number> = { approved: 0, pending: 1, cancelled: 2, rejected: 3 };
    const idsToDelete: string[] = [];

    for (const bookings of Object.values(groups)) {
      if (bookings.length <= 1) continue;
      bookings.sort((a, b) => {
        const sa = statusPriority[a.status] ?? 99;
        const sb = statusPriority[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.created_date || '').localeCompare(b.created_date || '');
      });
      for (let i = 1; i < bookings.length; i++) {
        idsToDelete.push(bookings[i].id);
      }
    }

    // Use deleteMany with ID-based queries in batches of 500
    let deleted = 0;
    const deleteBatchSize = 500;
    for (let i = 0; i < idsToDelete.length; i += deleteBatchSize) {
      const batch = idsToDelete.slice(i, i + deleteBatchSize);
      const result = await base44.asServiceRole.entities.Booking.deleteMany({ id: { $in: batch } });
      deleted += result.deleted_count || batch.length;
    }

    return Response.json({
      total_scanned: allBookings.length,
      duplicates_found: idsToDelete.length,
      deleted,
      remaining: allBookings.length - deleted
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});