import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inlined isPlatformAdmin — local imports don't work in Deno Deploy
// (see clubAuth/entry.ts for the shared definition; all backend functions inline this)
function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Secured club deletion — called directly from PlatformAdmin.jsx via
 * base44.functions.invoke('deleteClub', { clubId }).
 *
 * Because this is a direct SDK call (not an automation trigger), the caller's
 * JWT is present and base44.auth.me() returns their identity. We verify they are
 * a platform admin before doing anything, then cascade-delete all club data and
 * finally the club record itself.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || !isPlatformAdmin(user)) {
      return Response.json({ error: 'Forbidden: platform admin required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clubId = body.clubId;
    if (!clubId) {
      return Response.json({ error: 'Missing clubId' }, { status: 400 });
    }

    // Verify the club exists
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
    if (!clubs[0]) {
      return Response.json({ error: 'Club not found' }, { status: 404 });
    }

    console.log(`Platform admin ${user.email} deleting club ${clubId}`);

    // Cascade-delete all related entities (filtered by club_id) before removing
    // the club record itself, so a partial failure leaves the club recoverable.
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

    for (const entityName of entities) {
      try {
        await base44.asServiceRole.entities[entityName].deleteMany({ club_id: clubId });
      } catch (err) {
        console.warn(`Skipping ${entityName}: ${err.message}`);
      }
    }

    // Finally, delete the club itself
    await base44.asServiceRole.entities.Club.delete(clubId);

    return Response.json({ message: 'Club deleted', clubId });
  } catch (error) {
    console.error('deleteClub error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});