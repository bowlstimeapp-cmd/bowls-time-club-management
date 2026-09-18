// Shared helper — the full selectable member pool for a county:
// approved direct county members plus active members of approved affiliated clubs.

export async function getAllCountyMemberEmails(base44, countyId) {
  const [affiliations, countyMemberships] = await Promise.all([
    base44.asServiceRole.entities.ClubCountyAffiliation.filter({ county_id: countyId }),
    base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId }),
  ]);

  const emails = new Set();
  for (const m of countyMemberships) {
    if (m.status === 'approved') emails.add(m.user_email);
  }

  const affiliatedClubIds = affiliations.filter(a => a.status === 'approved').map(a => a.club_id);
  if (affiliatedClubIds.length > 0) {
    const clubMemberships = await Promise.all(
      affiliatedClubIds.map(clubId =>
        base44.asServiceRole.entities.ClubMembership.filter({ club_id: clubId, status: 'approved', member_status: 'active' })
      )
    );
    for (const members of clubMemberships) {
      for (const m of members) emails.add(m.user_email);
    }
  }

  return emails;
}