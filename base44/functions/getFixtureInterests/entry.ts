import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyApprovedMember, verifySelectorAccess, memberDisplayName } from '../../shared/fixtureHelpers.ts';

/**
 * Fixture interest for a club.
 *   member                -> only their own interest records
 *   club admin / selector -> everyone's, with the member's display name
 * Optional fixture_ids narrows the result to those fixtures.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { club_id, fixture_ids } = await req.json();
    if (!club_id) {
      return Response.json({ error: 'Missing required field: club_id' }, { status: 400 });
    }

    if (!await verifyApprovedMember(base44, user, club_id)) {
      return Response.json({ error: 'Forbidden: must be an approved club member' }, { status: 403 });
    }

    const canSeeAll = await verifySelectorAccess(base44, user, club_id);
    const ids = Array.isArray(fixture_ids) && fixture_ids.length > 0 ? fixture_ids : null;

    const records = canSeeAll
      ? await base44.asServiceRole.entities.FixtureInterest.filter({ club_id })
      : await base44.asServiceRole.entities.FixtureInterest.filter({ club_id, user_email: user.email });

    const filtered = ids ? records.filter((r) => ids.includes(r.fixture_id)) : records;

    let nameMap = {};
    if (canSeeAll) {
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({ club_id, status: 'approved' });
      nameMap = Object.fromEntries(memberships.map((m) => [m.user_email, memberDisplayName(m)]));
    }

    const interests = filtered.map((r) => ({
      fixture_id: r.fixture_id,
      user_email: r.user_email,
      member_name: nameMap[r.user_email] || r.user_email,
    }));

    return Response.json({ success: true, can_see_all: canSeeAll, interests });
  } catch (error) {
    console.error('getFixtureInterests error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});