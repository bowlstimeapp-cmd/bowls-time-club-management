/**
 * Server-side sanitisation and validation helpers for the website module.
 *
 * Every value written to a Website/Page/Section record passes through here:
 * HTML is reduced to an allowlist of tags/attributes, links are limited to
 * http(s)/mailto/tel or in-site paths, embeds are limited to approved hosts,
 * and bundle-relative asset paths are rewritten to uploaded file URLs.
 */

export const SECTION_TYPE_KEYS = [
  'hero', 'rich_text', 'image_text', 'feature_cards', 'gallery', 'news_list',
  'events_list', 'opening_times', 'membership_cta', 'committee', 'sponsors',
  'documents', 'faq', 'contact', 'embed', 'cta_banner', 'spacer', 'divider',
];

export const SECTION_REQUIRED = {
  hero: ['heading'],
  rich_text: ['body_html'],
  image_text: ['image'],
  feature_cards: [],
  gallery: ['images'],
  news_list: [],
  events_list: [],
  opening_times: ['rows'],
  membership_cta: ['heading'],
  committee: ['people'],
  sponsors: ['items'],
  documents: ['items'],
  faq: ['items'],
  contact: ['heading'],
  embed: ['embed_url'],
  cta_banner: ['heading'],
  spacer: [],
  divider: [],
};

export const AUTO_CAPABLE = ['news_list', 'events_list'];

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'h2', 'h3', 'h4', 'blockquote', 'a', 'img', 'figure', 'figcaption',
]);

const HTML_KEYS = new Set(['body_html', 'answer_html', 'description_html']);
const IMAGE_KEYS = new Set(['image', 'background_image', 'logo', 'photo', 'favicon_url', 'og_image_url', 'og_image']);
const FILE_KEYS = new Set(['file']);
const LINK_KEYS = new Set(['link', 'href', 'url', 'external_url', 'map_link']);
const EMBED_KEYS = new Set(['embed_url', 'map_embed_url']);
const ARRAY_KEYS = ['items', 'rows', 'cards', 'images', 'people', 'fees', 'buttons', 'children'];

const EMBED_HOSTS = ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'vimeo.com', 'maps.app.goo.gl'];

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isValidSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '');
}

export function safeUrl(value, allowRelative = true) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:/i.test(raw) || /^tel:/i.test(raw)) return raw;
  if (raw.startsWith('#')) return raw;
  if (allowRelative && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '';
}

export function safeImageUrl(value) {
  return safeUrl(value, false);
}

export function safeEmbedUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }
  if (!/^https?:$/.test(parsed.protocol)) return '';
  const host = parsed.hostname.toLowerCase();
  const hostAllowed = EMBED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  const googleMaps = /(^|\.)google\.(com|co\.uk)$/.test(host) && parsed.pathname.includes('/maps');
  if (!hostAllowed && !googleMaps) return '';
  return parsed.toString();
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([a-zA-Z0-9:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

const VOID_TAGS = new Set(['br', 'img']);

export function sanitizeHtml(html) {
  let out = String(html || '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math)[\s\S]*?<\/\1\s*>/gi, '');
  out = out.replace(/<(script|style|iframe|object|embed|form|input|link|meta|svg|math)[^>]*>/gi, '');

  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const stack = [];
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = tagRe.exec(out))) {
    result += out.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    const tag = String(match[1]).toLowerCase();
    const isClosing = match[0].startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (isClosing) {
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      stack.splice(index, 1);
      result += `</${tag}>`;
      continue;
    }

    const attrs = parseAttrs(match[2] || '');
    let opening = `<${tag}>`;

    if (tag === 'a') {
      const href = safeUrl(attrs.href);
      if (!href) continue;
      const title = attrs.title ? ` title="${escapeAttr(attrs.title)}"` : '';
      opening = `<a href="${escapeAttr(href)}" rel="noopener noreferrer"${title}>`;
    } else if (tag === 'img') {
      const src = safeImageUrl(attrs.src);
      if (!src) continue;
      const alt = attrs.alt ? ` alt="${escapeAttr(attrs.alt)}"` : ' alt=""';
      const title = attrs.title ? ` title="${escapeAttr(attrs.title)}"` : '';
      opening = `<img src="${escapeAttr(src)}"${alt}${title} loading="lazy">`;
    }

    result += opening;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }

  result += out.slice(lastIndex);
  while (stack.length > 0) result += `</${stack.pop()}>`;
  return result;
}

export function collectAssetRefs(value, found = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((v) => collectAssetRefs(v, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectAssetRefs(v, found));
    return found;
  }
  if (typeof value === 'string' && value.trim().startsWith('assets/')) found.add(value.trim());
  return found;
}

export function sanitizeValue(value, key, ctx) {
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, key, ctx));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeValue(v, k, ctx);
    return out;
  }
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (ctx.assetMap[trimmed]) return ctx.assetMap[trimmed];

  if (EMBED_KEYS.has(key)) {
    const url = safeEmbedUrl(value);
    if (trimmed && !url) ctx.warnings.push({ message: `Blocked embed URL (not an approved provider): ${trimmed}` });
    return url;
  }
  if (HTML_KEYS.has(key)) return sanitizeHtml(value);
  if (IMAGE_KEYS.has(key)) {
    if (!trimmed) return '';
    const url = safeImageUrl(value);
    if (!url) ctx.warnings.push({ message: `Removed unsafe image URL: ${trimmed}` });
    return url;
  }
  if (FILE_KEYS.has(key)) {
    if (!trimmed) return '';
    const url = safeUrl(value);
    if (!url) ctx.warnings.push({ message: `Removed unsafe file URL: ${trimmed}` });
    return url;
  }
  if (LINK_KEYS.has(key)) {
    if (!trimmed) return '';
    const url = safeUrl(value);
    if (!url) ctx.warnings.push({ message: `Removed unsafe link: ${trimmed}` });
    return url;
  }
  if (value.includes('<')) return stripTags(value);
  return value;
}

export function sanitizeContent(content, assetMap, warnings) {
  return sanitizeValue(content && typeof content === 'object' ? content : {}, 'content', { assetMap, warnings });
}

export function sanitizeNavigation(navigation, assetMap, warnings) {
  const list = Array.isArray(navigation) ? navigation : [];
  const clean = (items) => items.map((item) => {
    const entry = {
      label: stripTags(String(item?.label || '')).slice(0, 120),
      page_slug: isValidSlug(item?.page_slug) ? item.page_slug : '',
      external_url: safeUrl(item?.external_url),
    };
    if (Array.isArray(item?.children) && item.children.length) {
      entry.children = clean(item.children);
    }
    return entry;
  }).filter((item) => item.label && (item.page_slug || item.external_url || item.children?.length));
  return clean(list);
}

export function validateSections(pages, errors) {
  for (const page of pages) {
    page.sections.forEach((section, index) => {
      if (!SECTION_TYPE_KEYS.includes(section.type)) {
        errors.push({ message: `Page “${page.slug}”, section ${index + 1}: unknown section type “${section.type}”.` });
        return;
      }
      const required = SECTION_REQUIRED[section.type] || [];
      required.forEach((key) => {
        const value = section.content?.[key];
        const blank = value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
        if (blank) errors.push({ message: `Page “${page.slug}”, ${section.type} section: “${key}” is required.` });
      });
      ARRAY_KEYS.forEach((key) => {
        const value = section.content?.[key];
        if (value !== undefined && !Array.isArray(value)) {
          errors.push({ message: `Page “${page.slug}”, ${section.type} section: “${key}” must be a list.` });
        }
      });
      if (AUTO_CAPABLE.includes(section.type) && section.content?.mode !== 'auto') {
        if (!Array.isArray(section.content?.items) || section.content.items.length === 0) {
          errors.push({ message: `Page “${page.slug}”, ${section.type} section needs at least one item, or mode “auto”.` });
        }
      }
    });
  }
}