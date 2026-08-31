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

export function generateSessions(startTime, endTime, club) {
  if (club.use_custom_sessions && club.custom_sessions && club.custom_sessions.length > 0) {
    return club.custom_sessions.filter(s =>
      s.start < endTime && s.end > startTime
    );
  }

  const sessions = [];
  let current = startTime;
  const durationMinutes = Math.round((club.session_duration || 2) * 60);

  while (current < endTime) {
    const [h, m] = current.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    let sessionEnd = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0') + ':' + String(totalMinutes % 60).padStart(2, '0');

    if (sessionEnd > endTime) sessionEnd = endTime;

    sessions.push({ start: current, end: sessionEnd });
    current = sessionEnd;
  }

  return sessions;
}