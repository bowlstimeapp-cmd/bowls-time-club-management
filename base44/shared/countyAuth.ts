// Shared county auth helpers — used by all county backend functions.
// Mirrors the fixtureHelpers.ts pattern for club-side auth.

export function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export async function getCountyMembership(base44, userEmail, countyId) {
  const results = await base44.asServiceRole.entities.CountyMembership.filter({
    county_id: countyId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

export async function hasCountyRole(base44, userEmail, countyId, roles) {
  const membership = await getCountyMembership(base44, userEmail, countyId);
  return !!membership && roles.includes(membership.role);
}

export async function isPlatformAdminOrHasRole(base44, user, countyId, roles) {
  if (isPlatformAdmin(user)) return true;
  return hasCountyRole(base44, user.email, countyId, roles);
}

export async function isApprovedCountyMember(base44, userEmail, countyId) {
  return !!(await getCountyMembership(base44, userEmail, countyId));
}

export async function requireCountyRole(base44, user, countyId, roles) {
  if (!(await isPlatformAdminOrHasRole(base44, user, countyId, roles))) {
    throw { status: 403, message: `Forbidden: requires county role ${roles.join(' or ')}` };
  }
}