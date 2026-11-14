/**
 * Helpers shared by the public website renderer.
 * Bundle links are either a page slug ("/about") or an absolute URL — internal ones are
 * rewritten to the site's own route.
 */

export function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || ''));
}

export function isSpecialHref(href) {
  const value = String(href || '');
  return isExternalHref(value) || /^(mailto:|tel:)/i.test(value) || value.startsWith('#');
}

export function siteHref(link, siteSlug) {
  const raw = String(link || '').trim();
  if (!raw) return '';
  if (isSpecialHref(raw)) return raw;
  const cleaned = raw.replace(/[?#].*$/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleaned) return `/site/${siteSlug}`;
  return `/site/${siteSlug}/${cleaned}`;
}

export function formatSiteDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function themeVars(theme) {
  const colors = theme?.colors || {};
  const fonts = theme?.fonts || {};
  return {
    '--ws-primary': colors.primary || '#059669',
    '--ws-secondary': colors.secondary || '#0f172a',
    '--ws-accent': colors.accent || '#f59e0b',
    '--ws-bg': colors.background || '#ffffff',
    '--ws-text': colors.text || '#0f172a',
    '--ws-radius': theme?.radius || '8px',
    '--ws-font-heading': `"${fonts.heading || 'Arial'}", Arial, sans-serif`,
    '--ws-font-body': `"${fonts.body || 'Arial'}", Arial, sans-serif`,
  };
}

export function findPage(snapshot, pageSlug) {
  const pages = (snapshot?.pages || []).filter((page) => page.visible !== false);
  if (!pages.length) return null;
  if (!pageSlug) return pages.find((page) => page.is_home) || pages[0];
  return pages.find((page) => page.slug === pageSlug) || null;
}