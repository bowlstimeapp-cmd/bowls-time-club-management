/**
 * Shared club authorization helpers for backend functions.
 * 
 * Base44 RLS `user_condition` only checks global Users.role (admin/user).
 * It cannot check ClubMembership.role (admin/selector/steward/live_scorer/member).
 * 
 * All club-role-based authorization must therefore be enforced here in backend functions.
 */

/**
 * Returns true if the user has the global platform admin role (Users.role === 'admin').
 */
export function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Fetches the caller's ClubMembership for a given club.
 * Returns the membership record or null if not found / not approved.
 */
export async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId,
    user_email: userEmail,
    status: 'approved',
  });
  return results[0] || null;
}

/**
 * Returns true if the user has an approved membership at the given club
 * with one of the specified roles.
 * 
 * @param {object} base44 - the base44 SDK client
 * @param {string} userEmail
 * @param {string} clubId
 * @param {string[]} roles - e.g. ['admin', 'selector']
 */
export async function hasClubRole(base44, userEmail, clubId, roles) {
  const membership = await getClubMembership(base44, userEmail, clubId);
  if (!membership) return false;
  return roles.includes(membership.role);
}

/**
 * Returns true if the user is a platform admin OR has the required club role.
 */
export async function isPlatformAdminOrHasRole(base44, user, clubId, roles) {
  if (isPlatformAdmin(user)) return true;
  return hasClubRole(base44, user.email, clubId, roles);
}

/**
 * Returns true if the user is an approved club member (any role).
 */
export async function isApprovedClubMember(base44, userEmail, clubId) {
  const membership = await getClubMembership(base44, userEmail, clubId);
  return !!membership;
}

/**
 * Throws a 403 Response if the user does not have the required club role.
 * Use in backend functions: await requireClubRole(base44, user, clubId, ['admin'])
 */
export async function requireClubRole(base44, user, clubId, roles) {
  const allowed = await isPlatformAdminOrHasRole(base44, user, clubId, roles);
  if (!allowed) {
    throw { status: 403, message: `Forbidden: requires club role ${roles.join(' or ')}` };
  }
}

/**
 * Verify a record exists, belongs to the given club, and return it.
 * Returns null if not found or club_id mismatch.
 */
export async function verifyBelongsToClub(base44, entityName, recordId, clubId) {
  const records = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
  if (!records[0]) return null;
  if (records[0].club_id && records[0].club_id !== clubId) return null;
  return records[0];
}