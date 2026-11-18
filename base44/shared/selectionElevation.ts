// ---------------------------------------------------------------------------
// Per-selection, time-bound role elevation (Additional Selectors / Additional
// Live Scorers).
//
// The grant is stored on the TeamSelection record itself, so ClubMembership.role
// is never changed and there is nothing club-wide to revert. Every backend
// function that needs to allow an elevated member checks these helpers against
// the selection being accessed — never against the club in general.
// ---------------------------------------------------------------------------

export function normEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// London's UTC offset (ms) at a given instant.
function londonOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

// The instant at which the match day ends: 23:59:59 Europe/London on match_date.
function endOfMatchDay(matchDate) {
  const m = String(matchDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  const offset = londonOffsetMs(new Date(guess));
  let stamp = guess - offset;
  const settled = londonOffsetMs(new Date(stamp));
  if (settled !== offset) stamp = guess - settled;
  return stamp;
}

// A grant stops working once the selection is archived, or at the end of match
// day (Europe/London). With no match date it lasts until removed or archived.
export function isElevationActive(selection, now = Date.now()) {
  if (!selection) return false;
  if (selection.is_archived === true) return false;
  const endsAt = endOfMatchDay(selection.match_date);
  if (endsAt === null) return true;
  return now <= endsAt;
}

function inList(list, userEmail) {
  const email = normEmail(userEmail);
  if (!email) return false;
  return (Array.isArray(list) ? list : []).some((entry) => normEmail(entry?.email || entry) === email);
}

export function hasElevatedSelectorAccess(selection, userEmail) {
  if (!isElevationActive(selection)) return false;
  return inList(selection?.additional_selectors, userEmail);
}

// Additional selectors can also live score, exactly like full selectors do.
export function hasElevatedScorerAccess(selection, userEmail) {
  if (!isElevationActive(selection)) return false;
  return inList(selection?.additional_live_scorers, userEmail)
    || inList(selection?.additional_selectors, userEmail);
}