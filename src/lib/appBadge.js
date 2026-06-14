/**
 * Utility to update the PWA app icon badge count.
 * Supports Android Chrome/Edge and iOS 16.4+ PWAs via the Web Badging API.
 */
export async function updateAppBadge(count) {
  if (count > 0) {
    if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(count);
    }
  } else {
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  }
}