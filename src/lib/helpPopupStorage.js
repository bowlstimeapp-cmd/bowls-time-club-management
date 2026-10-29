/**
 * Storage helpers for the context-sensitive help pop-ups.
 *
 * - Session dismissal (this browser session only) → sessionStorage per page
 * - Permanent dismissal → the user account (dismissed_help_popups),
 *   with localStorage as a fallback if saving to the account fails
 */

import { base44 } from '@/api/base44Client';

const SESSION_PREFIX = 'bowlstime_help_popup_dismissed_';
const LOCAL_KEY = 'bowlstime_help_popups_dismissed';

export function sessionKey(pageName) {
  return SESSION_PREFIX + pageName;
}

export function getLocalDismissed() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalDismissed(pageName) {
  const list = getLocalDismissed();
  if (!list.includes(pageName)) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...list, pageName]));
  }
}

export function isPageDismissed(pageName, user) {
  if ((user?.dismissed_help_popups || []).includes(pageName)) return true;
  if (getLocalDismissed().includes(pageName)) return true;
  return sessionStorage.getItem(sessionKey(pageName)) === 'true';
}

export function markSessionDismissed(pageName) {
  sessionStorage.setItem(sessionKey(pageName), 'true');
}

export function clearSessionDismissals() {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(SESSION_PREFIX)) keys.push(key);
  }
  keys.forEach(key => sessionStorage.removeItem(key));
}

/** Clears every dismissal for this user, on the account and in this browser. */
export async function clearAllHelpPopupDismissals() {
  clearSessionDismissals();
  localStorage.removeItem(LOCAL_KEY);
  await base44.auth.updateMe({ dismissed_help_popups: [] });
}