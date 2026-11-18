// Client mirror of base44/shared/selectionElevation.ts.
// The backend is the real enforcement; this only decides what to show.

export const normEmail = (value) => String(value || '').trim().toLowerCase();

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

export function hasElevatedScorerAccess(selection, userEmail) {
  if (!isElevationActive(selection)) return false;
  return inList(selection?.additional_live_scorers, userEmail)
    || inList(selection?.additional_selectors, userEmail);
}

export const ACCESS_LABELS = {
  additional_selector: 'Additional Selector',
  additional_live_scorer: 'Additional Live Scorer',
};