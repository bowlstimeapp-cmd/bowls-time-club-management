/**
 * Client-side bundle validation for the website importer.
 * Produces blocking errors, non-blocking warnings and a preview summary
 * before anything is uploaded or written.
 */
import { SECTION_TYPE_MAP, isValidSlug, slugify } from './sectionTypes';

export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  pdf: 'application/pdf',
};

const ARRAY_KEYS = ['items', 'rows', 'cards', 'images', 'people', 'fees', 'buttons', 'children'];

export function mimeForPath(path) {
  const ext = String(path).split('.').pop().toLowerCase();
  return MIME_BY_EXT[ext] || '';
}

export function baseName(path) {
  return String(path).split('/').pop();
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function collectPaths(value, found) {
  if (Array.isArray(value)) {
    value.forEach((v) => collectPaths(v, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectPaths(v, found));
    return found;
  }
  if (typeof value === 'string' && value.trim().startsWith('assets/')) found.add(value.trim());
  return found;
}

function validateSections(sections, pageSlug, assetPaths, errors, warnings) {
  const list = Array.isArray(sections) ? sections : [];
  if (!Array.isArray(sections)) {
    errors.push({ message: `Page “${pageSlug}”: sections must be a list.` });
    return [];
  }

  return list.map((section, index) => {
    const def = SECTION_TYPE_MAP[section?.type];
    if (!def) {
      errors.push({ message: `Page “${pageSlug}”, section ${index + 1}: unknown section type “${section?.type}”.` });
      return null;
    }
    const content = section.content && typeof section.content === 'object' ? section.content : {};
    const autoMode = content.mode === 'auto' && def.supportsAuto;

    def.fields.filter((f) => f.required).forEach((f) => {
      if (isBlank(content[f.key])) {
        errors.push({ message: `Page “${pageSlug}”, ${def.label} section: “${f.label}” is required.` });
      }
    });

    ARRAY_KEYS.forEach((key) => {
      if (content[key] !== undefined && !Array.isArray(content[key])) {
        errors.push({ message: `Page “${pageSlug}”, ${def.label} section: “${key}” must be a list.` });
      }
    });

    if (def.supportsAuto && !autoMode) {
      const itemsField = def.fields.find((f) => f.requiredWhenManual);
      if (itemsField && isBlank(content[itemsField.key])) {
        errors.push({ message: `Page “${pageSlug}”, ${def.label} section: needs at least one item, or set mode to “auto”.` });
      }
    }

    collectPaths(content, new Set()).forEach((p) => {
      if (!assetPaths.has(p)) {
        errors.push({ message: `Page “${pageSlug}”, ${def.label} section: image “${p}” is referenced but missing from the bundle.` });
      }
    });

    return {
      type: section.type,
      visible: section.visible !== false,
      content,
    };
  }).filter(Boolean);
}

export function validateBundle({ siteJson, assetFiles }) {
  const errors = [];
  const warnings = [];
  const files = Array.isArray(assetFiles) ? assetFiles : [];

  if (!siteJson || typeof siteJson !== 'object') {
    return { ok: false, errors: [{ message: 'site.json is not a valid JSON object.' }], warnings, summary: null };
  }
  if (siteJson.schema_version && siteJson.schema_version !== '1.0') {
    warnings.push({ message: `Bundle schema version “${siteJson.schema_version}” — this importer expects 1.0.` });
  }

  const rawSite = siteJson.site;
  if (!rawSite || typeof rawSite !== 'object') {
    return { ok: false, errors: [{ message: 'site.json is missing the “site” object.' }], warnings, summary: null };
  }

  const siteName = String(rawSite.name || '').trim();
  if (!siteName) errors.push({ message: 'The site requires a name.' });

  const siteSlug = isValidSlug(rawSite.slug) ? rawSite.slug : slugify(rawSite.slug || siteName);
  if (!siteSlug) errors.push({ message: 'The site requires a URL-safe slug.' });

  // Assets present in the bundle
  const assetPaths = new Set(files.map((f) => f.path));
  let totalBytes = 0;
  files.forEach((f) => {
    totalBytes += f.size || 0;
    if (!mimeForPath(f.path)) {
      errors.push({ message: `“${f.path}” is not a supported file type (images or PDF only).` });
    }
    if ((f.size || 0) > MAX_ASSET_BYTES) {
      errors.push({ message: `“${f.path}” is larger than 5MB.` });
    }
    if (!f.path.startsWith('assets/')) {
      warnings.push({ message: `“${f.path}” sits outside the assets folder and will still be uploaded.` });
    }
  });
  if (totalBytes > MAX_TOTAL_BYTES) {
    errors.push({ message: `The bundle assets total ${(totalBytes / 1024 / 1024).toFixed(1)}MB, above the 50MB limit.` });
  }

  // Pages
  const rawPages = Array.isArray(siteJson.pages) ? siteJson.pages : [];
  if (rawPages.length === 0) errors.push({ message: 'The bundle contains no pages.' });

  const seenSlugs = new Set();
  const homePages = rawPages.filter((p) => p?.is_home === true);
  if (homePages.length > 1) errors.push({ message: 'More than one page is marked as the home page.' });
  if (rawPages.length > 0 && homePages.length === 0) {
    warnings.push({ message: 'No page is marked as home — the first page will be used.' });
  }

  const counts = {};
  let sectionTotal = 0;

  const pages = rawPages.map((rawPage, index) => {
    const title = String(rawPage?.title || '').trim();
    const slug = isValidSlug(rawPage?.slug) ? rawPage.slug : slugify(rawPage?.slug || title);
    if (!title) errors.push({ message: `Page ${index + 1} is missing a title.` });
    if (!slug) errors.push({ message: `Page “${title || index + 1}” is missing a URL-safe slug.` });
    else if (seenSlugs.has(slug)) errors.push({ message: `Duplicate page slug “${slug}”.` });
    else seenSlugs.add(slug);

    const sections = validateSections(rawPage?.sections, slug || `page ${index + 1}`, assetPaths, errors, warnings);
    sectionTotal += sections.length;
    sections.forEach((s) => { counts[s.type] = (counts[s.type] || 0) + 1; });

    return {
      title,
      slug,
      is_home: homePages.length === 0 ? index === 0 : rawPage?.is_home === true,
      order: Number(rawPage?.order ?? index),
      visible: rawPage?.visible !== false,
      seo: {
        title: String(rawPage?.seo?.title || ''),
        description: String(rawPage?.seo?.description || ''),
        og_image: String(rawPage?.seo?.og_image || ''),
      },
      sections,
    };
  });

  const website = {
    name: siteName,
    slug: siteSlug,
    settings: rawSite.settings && typeof rawSite.settings === 'object' ? rawSite.settings : {},
    theme: rawSite.theme && typeof rawSite.theme === 'object' ? rawSite.theme : {},
    navigation: Array.isArray(rawSite.navigation) ? rawSite.navigation : [],
    footer: rawSite.footer && typeof rawSite.footer === 'object' ? rawSite.footer : {},
  };

  const pageSlugs = new Set(pages.map((p) => p.slug));
  const checkNav = (items) => {
    (Array.isArray(items) ? items : []).forEach((item) => {
      if (item?.page_slug && !pageSlugs.has(item.page_slug)) {
        warnings.push({ message: `Navigation links to “${item.page_slug}”, which is not in this bundle.` });
      }
      checkNav(item?.children);
    });
  };
  checkNav(website.navigation);

  const summary = {
    siteName,
    siteSlug,
    pages: pages.length,
    sections: sectionTotal,
    counts,
    assets: files.length,
    totalBytes,
    homeSlug: pages.find((p) => p.is_home)?.slug || pages[0]?.slug || '',
  };

  return { ok: errors.length === 0, errors, warnings, website, pages, summary };
}