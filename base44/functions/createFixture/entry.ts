import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyClubAdmin, verifyBelongsToClub } from '../../shared/fixtureHelpers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { club_id, competition_id, date, time, finish_time, venue, notes } = await req.json();

    if (!club_id || !competition_id || !date || !time || !venue) {
      return Response.json({ error: 'Missing required fields: club_id, competition_id, date, time, venue' }, { status: 400 });
    }

    if (!await verifyClubAdmin(base44, user, club_id)) {
      return Response.json({ error: 'Forbidden: must be a club admin' }, { status: 403 });
    }

    // Verify competition belongs to this club
    const competition = await verifyBelongsToClub(base44, 'Competition', competition_id, club_id);
    if (!competition) {
      return Response.json({ error: 'Competition not found or does not belong to this club' }, { status: 404 });
    }

    // Create the fixture
    const fixture = await base44.asServiceRole.entities.ClubFixture.create({
      club_id, competition_id, date, time, finish_time: finish_time || '', venue, notes: notes || '',
    });

    // Try to match Competition.name against the TeamSelection competition enum
    const SELECTION_ENUM = ['Bramley', 'Wessex League', 'Denny', 'Top Club'];
    const compNameLower = (competition.name || '').trim().toLowerCase();
    const matchedEnum = SELECTION_ENUM.find(e => e.toLowerCase() === compNameLower);

    let draftSelectionCreated = false;
    let selectionMessage = '';

    if (matchedEnum) {
      try {
        await base44.asServiceRole.entities.TeamSelection.create({
          club_id,
          competition: matchedEnum,
          match_date: date,
          match_start_time: time,
          match_end_time: finish_time || '',
          home_rinks: competition.home_rinks || 2,
          status: 'draft',
          selector_email: user.email,
        });
        draftSelectionCreated = true;
      } catch (e) {
        selectionMessage = `Failed to create draft selection: ${e.message}`;
      }
    } else {
      selectionMessage = `No matching selection type for '${competition.name}' — create the selection manually`;
    }

    return Response.json({
      success: true,
      fixture,
      draftSelectionCreated,
      selectionMessage,
    });
  } catch (error) {
    console.error('createFixture error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});