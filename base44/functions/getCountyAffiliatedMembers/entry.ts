import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { countyId } = await req.json();
    if (!countyId) return Response.json({ error: 'Missing countyId' }, { status: 400 });

    // Fetch all affiliations and county memberships
    const [allAffiliations, countyMemberships] = await Promise.all([
      base44.asServiceRole.entities.ClubCountyAffiliation.filter({ county_id: countyId }),
      base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId }),
    ]);

    const affiliations = allAffiliations.filter(a => a.status === 'approved');
    const pendingAffiliations = allAffiliations.filter(a => a.status === 'pending');

    // Fetch club names for all affiliated clubs
    const allClubIds = [...new Set(allAffiliations.map(a => a.club_id))];
    const clubs = allClubIds.length > 0
      ? await Promise.all(allClubIds.map(id => base44.asServiceRole.entities.Club.filter({ id }).then(r => r[0])))
      : [];
    const clubMap = new Map();
    clubs.filter(Boolean).forEach(c => clubMap.set(c.id, c.name));

    // Fetch club memberships for approved affiliated clubs
    const approvedClubIds = affiliations.map(a => a.club_id);
    const clubMembershipsRaw = approvedClubIds.length > 0
      ? await Promise.all(approvedClubIds.map(clubId => base44.asServiceRole.entities.ClubMembership.filter({ club_id: clubId, status: 'approved', member_status: 'active' })))
      : [];

    // Build merged member map
    const memberMap = new Map();

    // Add direct county members (approved)
    for (const m of countyMemberships.filter(m => m.status === 'approved')) {
      memberMap.set(m.user_email, {
        email: m.user_email,
        name: m.user_name || m.user_email,
        role: m.role,
        source: 'direct',
        clubs: [],
        countyMembershipId: m.id,
      });
    }

    // Add/merge club members
    clubMembershipsRaw.forEach((members, idx) => {
      const clubId = approvedClubIds[idx];
      const clubName = clubMap.get(clubId) || 'Unknown';
      for (const m of members) {
        const existing = memberMap.get(m.user_email);
        if (existing) {
          existing.clubs.push({ clubId, clubName });
          if (existing.source === 'direct') existing.source = 'both';
        } else {
          const name = m.user_name || ((m.first_name || '') + ' ' + (m.surname || '')).trim() || m.user_email;
          memberMap.set(m.user_email, {
            email: m.user_email,
            name,
            role: 'member',
            source: 'club',
            clubs: [{ clubId, clubName }],
          });
        }
      }
    });

    // Pending direct memberships
    const pending = countyMemberships.filter(m => m.status === 'pending').map(m => ({
      id: m.id,
      email: m.user_email,
      name: m.user_name || m.user_email,
      role: m.role,
    }));

    return Response.json({
      approved: Array.from(memberMap.values()),
      pending,
      affiliatedClubs: affiliations.map(a => ({ id: a.id, clubId: a.club_id, clubName: clubMap.get(a.club_id) || 'Unknown', status: a.status })),
      pendingAffiliations: pendingAffiliations.map(a => ({ id: a.id, clubId: a.club_id, clubName: clubMap.get(a.club_id) || 'Unknown', requestedBy: a.requested_by })),
      totalMembers: memberMap.size,
    });
  } catch (error) {
    console.error('getCountyAffiliatedMembers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});