// Shared club-authorisation helpers for the website module.
// RLS rules cannot read ClubMembership.role, so every website function checks it here.

export function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId,
    user_email: userEmail,
    status: 'approved',
  });
  return results[0] || null;
}

// True when the signed-in user may manage the given club's website.
export async function canManageClubWebsite(base44, user, clubId) {
  if (!user || !clubId) return false;
  if (isPlatformAdmin(user)) return true;
  const membership = await getClubMembership(base44, user.email, clubId);
  return membership?.role === 'admin';
}