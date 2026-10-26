// Indoor / outdoor green helpers shared by the booking backend functions.
//
// A club with `dual_greens_enabled` runs separate rink configurations per green.
// The two greens are independent: a rink booked indoors can still be booked outdoors
// in the same slot, so only bookings on the same green can clash.

export function isDualGreens(club: any): boolean {
  return !!club?.dual_greens_enabled;
}

export function primaryGreen(club: any): 'indoor' | 'outdoor' {
  return club?.season === 'outdoor' ? 'outdoor' : 'indoor';
}

export function bookingGreen(booking: any, club: any): 'indoor' | 'outdoor' {
  if (booking?.green_type === 'indoor' || booking?.green_type === 'outdoor') {
    return booking.green_type;
  }
  return primaryGreen(club);
}

/** Resolve the green requested for a new booking, defaulting to the club's primary green. */
export function resolveGreen(club: any, requested?: string | null): 'indoor' | 'outdoor' {
  if (!isDualGreens(club)) return primaryGreen(club);
  return requested === 'indoor' || requested === 'outdoor' ? requested : primaryGreen(club);
}

/** Rink count / opening times / sessions for one green. */
export function greenConfig(club: any, greenType?: string | null) {
  const green = resolveGreen(club, greenType);
  if (!isDualGreens(club)) {
    return {
      rink_count: club?.rink_count || 6,
      opening_time: club?.opening_time || '10:00',
      closing_time: club?.closing_time || '21:00',
      session_duration: club?.session_duration || 2,
      use_custom_sessions: !!club?.use_custom_sessions,
      custom_sessions: Array.isArray(club?.custom_sessions) ? club.custom_sessions : [],
    };
  }
  const stored = (green === 'indoor' ? club?.indoor_rink_config : club?.outdoor_rink_config) || {};
  const fallback = green === primaryGreen(club) ? club : null;
  const pick = (key: string, empty: any) => {
    if (stored[key] !== undefined && stored[key] !== null) return stored[key];
    if (fallback && fallback[key] !== undefined && fallback[key] !== null) return fallback[key];
    return empty;
  };
  return {
    rink_count: pick('rink_count', 6) || 6,
    opening_time: pick('opening_time', '10:00'),
    closing_time: pick('closing_time', '21:00'),
    session_duration: pick('session_duration', 2) || 2,
    use_custom_sessions: !!pick('use_custom_sessions', false),
    custom_sessions: pick('custom_sessions', []) || [],
  };
}

/** True when two bookings could clash. The indoor and outdoor greens are independent, so only
 *  bookings on the same green can clash. */
export function greensClash(bookingA: any, bookingB: any, club: any): boolean {
  if (!isDualGreens(club)) return true;
  return bookingGreen(bookingA, club) === bookingGreen(bookingB, club);
}

/** Club object with one green's rink settings laid over the top-level fields. */
export function clubForGreen(club: any, greenType?: string | null) {
  if (!club) return club;
  return { ...club, ...greenConfig(club, greenType) };
}