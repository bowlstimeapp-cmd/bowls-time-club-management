import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyClubAdmin, verifyBelongsToClub } from '../../shared/fixtureHelpers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fixtureId, club_id, updates } = await req.json();

    if (!fixtureId || !club_id) {
      return Response.json({ error: 'Missing required fields: fixtureId, club_id' }, { status: 400 });
    }

    if (!await verifyClubAdmin(base44, user, club_id)) {
      return Response.json({ error: 'Forbidden: must be a club admin' }, { status: 403 });
    }

    // Verify fixture belongs to this club
    const fixture = await verifyBelongsToClub(base44, 'ClubFixture', fixtureId, club_id);
    if (!fixture) {
      return Response.json({ error: 'Fixture not found or does not belong to this club' }, { status: 404 });
    }

    // Only allow editable fields
    const allowedFields = ['competition_id', 'date', 'time', 'finish_time', 'opponent', 'venue', 'notes'];
    const safeUpdates = {};
    for (const field of allowedFields) {
      if (field in updates) safeUpdates[field] = updates[field];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await base44.asServiceRole.entities.ClubFixture.update(fixtureId, safeUpdates);
    return Response.json({ success: true });
  } catch (error) {
    console.error('updateFixture error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});