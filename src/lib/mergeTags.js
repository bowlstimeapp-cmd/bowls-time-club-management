// Shared merge-tag helpers for admin broadcast emails (client-side preview / test).
// Mirrors the logic in base44/functions/sendAdminBroadcastEmail/entry.ts.

export const SAMPLE_RECIPIENT = {
  email: '',
  first_name: 'Jane',
  name: 'Jane Smith',
  club_names: ['Example Bowls Club'],
};

export function joinNaturally(names) {
  const list = (Array.isArray(names) ? names : []).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildMergeValues(recipient) {
  const r = recipient || SAMPLE_RECIPIENT;
  const fullName = String(r.name || '').trim();
  const firstName = String(r.first_name || '').trim() || fullName.split(/\s+/)[0] || 'there';
  return {
    first_name: firstName,
    admin_name: fullName || firstName || 'there',
    club_name: joinNaturally(r.club_names) || 'your club',
  };
}

// Replaces {{ first_name }}, {{admin_name}}, {{club_name}} — case-insensitive, unknown tags untouched
export function mergeTags(text, recipient, { escape = false } = {}) {
  const values = buildMergeValues(recipient);
  return String(text || '').replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, tag) => {
    const key = String(tag).toLowerCase();
    if (!(key in values)) return match;
    return escape ? escapeHtml(values[key]) : values[key];
  });
}