import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyClubAdmin, verifyBelongsToClub, SELECTION_ENUM, normaliseFixtureGender } from '../../shared/fixtureHelpers.ts';

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
    const allowedFields = ['competition_id', 'date', 'time', 'finish_time', 'opponent', 'venue', 'notes', 'broadcast', 'gender'];
    const safeUpdates = {};
    for (const field of allowedFields) {
      if (field in updates) safeUpdates[field] = updates[field];
    }

    // Broadcast is a plain on/off flag — never store a truthy non-boolean
    if ('broadcast' in safeUpdates) safeUpdates.broadcast = Boolean(safeUpdates.broadcast);

    if ('gender' in safeUpdates) safeUpdates.gender = normaliseFixtureGender(safeUpdates.gender);

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await base44.asServiceRole.entities.ClubFixture.update(fixtureId, safeUpdates);

    // Keep a linked DRAFT selection in step with its fixture. Published
    // selections are deliberately left alone.
    const linkFields = ['competition_id', 'date', 'time', 'finish_time', 'opponent'];
    if (linkFields.some(f => f in safeUpdates)) {
      const linked = await base44.asServiceRole.entities.TeamSelection.filter({ fixture_id: fixtureId, club_id });
      const draft = linked.find(s => s.status === 'draft');
      if (draft) {
        const selUpdates = {};
        if ('date' in safeUpdates) selUpdates.match_date = safeUpdates.date;
        if ('time' in safeUpdates) selUpdates.match_start_time = safeUpdates.time;
        if ('finish_time' in safeUpdates) selUpdates.match_end_time = safeUpdates.finish_time;
        if ('opponent' in safeUpdates) selUpdates.opponent = safeUpdates.opponent;
        if ('competition_id' in safeUpdates) {
          const comp = await verifyBelongsToClub(base44, 'Competition', safeUpdates.competition_id, club_id);
          const matched = SELECTION_ENUM.find(e => e.toLowerCase() === (comp?.name || '').trim().toLowerCase());
          if (matched) selUpdates.competition = matched;
        }
        if (Object.keys(selUpdates).length > 0) {
          await base44.asServiceRole.entities.TeamSelection.update(draft.id, selUpdates);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('updateFixture error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});