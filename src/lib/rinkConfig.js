// Helpers for clubs that run both indoor and outdoor greens.
//
// A club with `dual_greens_enabled` keeps a separate rink configuration for each
// green (`indoor_rink_config` / `outdoor_rink_config`). Single-green clubs keep
// using the top-level rink_count / opening_time / ... fields.

export const GREEN_LABELS = { indoor: 'Indoor', outdoor: 'Outdoor' };

export const DEFAULT_RINK_CONFIG = {
  rink_count: 6,
  opening_time: '10:00',
  closing_time: '21:00',
  session_duration: 2,
  use_custom_sessions: false,
  custom_sessions: [],
};

export function isDualGreens(club) {
  return !!club?.dual_greens_enabled;
}

/** The green a single-green club bowls on. */
export function getPrimaryGreen(club) {
  return club?.season === 'outdoor' ? 'outdoor' : 'indoor';
}

/** Greens this club has, primary first. */
export function getGreenTypes(club) {
  if (!isDualGreens(club)) return [getPrimaryGreen(club)];
  const primary = getPrimaryGreen(club);
  return primary === 'outdoor' ? ['outdoor', 'indoor'] : ['indoor', 'outdoor'];
}

/** The green a booking sits on (legacy bookings fall back to the club's primary green). */
export function getBookingGreen(booking, club) {
  if (booking?.green_type === 'indoor' || booking?.green_type === 'outdoor') {
    return booking.green_type;
  }
  return getPrimaryGreen(club);
}

/** True when two bookings could clash. The indoor and outdoor greens are independent, so only
 *  bookings on the same green can clash. */
export function greensClash(bookingA, bookingB, club) {
  if (!isDualGreens(club)) return true;
  return getBookingGreen(bookingA, club) === getBookingGreen(bookingB, club);
}

/** Rink count / opening times / sessions for one green. */
export function getRinkConfig(club, greenType) {
  if (!club) return { ...DEFAULT_RINK_CONFIG };
  const primary = getPrimaryGreen(club);

  if (!isDualGreens(club)) {
    return {
      rink_count: club.rink_count || DEFAULT_RINK_CONFIG.rink_count,
      opening_time: club.opening_time || DEFAULT_RINK_CONFIG.opening_time,
      closing_time: club.closing_time || DEFAULT_RINK_CONFIG.closing_time,
      session_duration: club.session_duration || DEFAULT_RINK_CONFIG.session_duration,
      use_custom_sessions: !!club.use_custom_sessions,
      custom_sessions: Array.isArray(club.custom_sessions) ? club.custom_sessions : [],
    };
  }

  const green = greenType === 'indoor' || greenType === 'outdoor' ? greenType : primary;
  const stored = (green === 'indoor' ? club.indoor_rink_config : club.outdoor_rink_config) || {};
  // Before the club has saved a green's own settings, its primary green keeps the legacy top-level values
  const fallback = green === primary ? club : null;
  const pick = (key, empty) => {
    const value = stored[key];
    if (value !== undefined && value !== null) return value;
    const legacy = fallback?.[key];
    return legacy !== undefined && legacy !== null ? legacy : empty;
  };

  return {
    rink_count: pick('rink_count', DEFAULT_RINK_CONFIG.rink_count) || DEFAULT_RINK_CONFIG.rink_count,
    opening_time: pick('opening_time', DEFAULT_RINK_CONFIG.opening_time),
    closing_time: pick('closing_time', DEFAULT_RINK_CONFIG.closing_time),
    session_duration: pick('session_duration', DEFAULT_RINK_CONFIG.session_duration) || DEFAULT_RINK_CONFIG.session_duration,
    use_custom_sessions: !!pick('use_custom_sessions', false),
    custom_sessions: pick('custom_sessions', []) || [],
  };
}

/** Club object with the given green's rink settings laid over the top-level fields. */
export function withRinkConfig(club, greenType) {
  if (!club) return club;
  return { ...club, ...getRinkConfig(club, greenType) };
}

/** Session start/end for a booking moved to `startTime` on the given green. */
export function endTimeForStart(club, greenType, startTime) {
  const config = getRinkConfig(club, greenType);
  if (config.use_custom_sessions && config.custom_sessions?.length > 0) {
    const session = config.custom_sessions.find((s) => s.start === startTime);
    if (session) return session.end;
  }
  const [hour, min = 0] = startTime.split(':').map(Number);
  const endMins = hour * 60 + min + (config.session_duration || 2) * 60;
  return `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
}