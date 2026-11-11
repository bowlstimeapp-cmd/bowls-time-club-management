import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyApprovedMember, verifyBelongsToClub, getClubMembership, memberMatchesFixtureGender } from '../../shared/fixtureHelpers.ts';

/**
 * Toggle the signed-in member's interest in one club fixture.
 * One FixtureInterest record per member per fixture — members can only ever
 * toggle their own interest (the email always comes from the session).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { club_id, fixture_id } = await req.json();
    if (!club_id || !fixture_id) {
      return Response.json({ error: 'Missing required fields: club_id, fixture_id' }, { status: 400 });
    }

    if (!await verifyApprovedMember(base44, user, club_id)) {
      return Response.json({ error: 'Forbidden: must be an approved club member' }, { status: 403 });
    }

    const fixture = await verifyBelongsToClub(base44, 'ClubFixture', fixture_id, club_id);
    if (!fixture) {
      return Response.json({ error: 'Fixture not found or does not belong to this club' }, { status: 404 });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (!fixture.date || fixture.date < today) {
      return Response.json({ error: 'This fixture has passed' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.FixtureInterest.filter({
      club_id,
      fixture_id,
      user_email: user.email,
    });

    // Withdrawing an existing sign-up is always allowed, even if the fixture
    // has since been un-broadcast — only new sign-ups need an open fixture.
    if (existing[0]) {
      await base44.asServiceRole.entities.FixtureInterest.delete(existing[0].id);
      return Response.json({ success: true, interested: false });
    }

    if (fixture.broadcast !== true) {
      return Response.json({ error: 'This fixture is not open for sign-up' }, { status: 400 });
    }

    // Sign-ups must match the fixture's gender (men's, women's or mixed)
    const membership = await getClubMembership(base44, user.email, club_id);
    if (membership && !memberMatchesFixtureGender(fixture.gender, membership.gender)) {
      return Response.json({
        error: fixture.gender === 'men'
          ? "This fixture is for male members only"
          : "This fixture is for female members only",
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.FixtureInterest.create({
      club_id,
      fixture_id,
      user_email: user.email,
    });
    return Response.json({ success: true, interested: true });
  } catch (error) {
    console.error('toggleFixtureInterest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});