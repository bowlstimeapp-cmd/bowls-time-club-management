// Auth + time helpers shared across fixture backend functions.
// Inlined pattern mirrors updateClubSettings/createBooking — kept here to avoid
// duplicating across createFixture, updateFixture, deleteFixture, bookFixtureRinks.

export function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

export async function verifyClubAdmin(base44, user, clubId) {
  if (isPlatformAdmin(user)) return true;
  const membership = await getClubMembership(base44, user.email, clubId);
  return !!(membership && membership.role === 'admin');
}

export async function verifyBelongsToClub(base44, entityName, recordId, clubId) {
  const records = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
  if (!records[0]) return null;
  if (records[0].club_id && records[0].club_id !== clubId) return null;
  return records[0];
}

export function addHoursToTime(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
}