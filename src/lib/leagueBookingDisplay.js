export const LEAGUE_BOOKER_PREFIX = 'League - ';

/**
 * A league booking is identified by its booker_name prefix ("League - <League Name>")
 * rather than by a fixture link, so bookings that were never linked (later session
 * slots, failed link writes, older bookings) still display correctly.
 */
export const isLeagueBooking = (booking) =>
  !!booking && typeof booking.booker_name === 'string' &&
  booking.booker_name.startsWith(LEAGUE_BOOKER_PREFIX);

/**
 * Returns { leagueName, matchText } for a league booking.
 * - leagueName: booker_name with the "League - " prefix removed.
 * - matchText: booking.notes if present, otherwise (when a linked fixture and
 *   team data are available) "<home team> vs <away team>".
 */
export const getLeagueBookingDisplay = (booking, leagueFixtures = [], leagueTeams = []) => {
  const leagueName = (booking?.booker_name || '').slice(LEAGUE_BOOKER_PREFIX.length).trim();
  let matchText = booking?.notes || '';
  if (!matchText && booking?.id) {
    const fixture = leagueFixtures.find(f => f.booking_id === booking.id);
    if (fixture) {
      const homeName = leagueTeams.find(t => t.id === fixture.home_team_id)?.name;
      const awayName = leagueTeams.find(t => t.id === fixture.away_team_id)?.name;
      if (homeName && awayName) matchText = `${homeName} vs ${awayName}`;
    }
  }
  return { leagueName, matchText };
};