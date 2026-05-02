import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Only handle delete events
    const eventType = payload?.event?.type;
    if (eventType !== 'delete') {
      return Response.json({ message: 'Not a delete event, skipping' });
    }

    // Get club_id from the deleted entity data
    // payload.data has the entity data before deletion
    const clubId = payload?.data?.id || payload?.event?.entity_id;
    if (!clubId) {
      return Response.json({ error: 'No club ID found in payload' }, { status: 400 });
    }

    console.log(`Cascading delete for club: ${clubId}`);

    const entities = [
      'League',
      'LeagueTeam',
      'LeagueFixture',
      'Booking',
      'TeamSelection',
      'MatchScore',
      'MemberAvailability',
      'ScorePrediction',
      'ClubMembership',
      'ClubTournament',
      'AuditLog',
      'BookingAuditLog',
      'ClubPost',
      'ClubGalleryImage',
      'ClubHomepage',
      'ClubMessage',
      'Notification',
      'OpenCompetitionContact',
      'CompetitionRegistration',
      'CompetitionEntry',
      'FunctionRoom',
      'FunctionRoomBooking',
      'ScorecardLayout',
      'TeamBoardPost',
      'ClubAccolade',
      'ClubAccoladeAssignment',
    ];

    const results = {};
    for (const entityName of entities) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({ club_id: clubId });
        if (records.length > 0) {
          for (const record of records) {
            await base44.asServiceRole.entities[entityName].delete(record.id);
          }
          results[entityName] = records.length;
          console.log(`Deleted ${records.length} ${entityName} records for club ${clubId}`);
        }
      } catch (err) {
        console.warn(`Skipping ${entityName}: ${err.message}`);
      }
    }

    return Response.json({ message: 'Cascade delete complete', clubId, deleted: results });
  } catch (error) {
    console.error('Cascade delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});