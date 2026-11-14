import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  SECTION_TYPE_KEYS,
  sanitizeContent,
  sanitizeNavigation,
  sanitizeHtml,
  safeUrl,
  safeImageUrl,
  collectAssetRefs,
  isValidSlug,
  slugify,
  stripTags,
  validateSections,
} from '../../shared/websiteSanitize.ts';

// ---------------------------------------------------------------------------
// Club authorisation (RLS cannot check ClubMembership.role, so we do it here)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId,
    user_email: userEmail,
    status: 'approved',
  });
  return results[0] || null;
}

function blank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  let createdWebsiteId = null;

  try {
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      clubId,
      mode = 'new',
      targetWebsiteId = '',
      filename = '',
      website: rawWebsite,
      pages: rawPages,
      assets: rawAssets,
    } = body;

    if (!clubId || typeof clubId !== 'string') {
      return Response.json({ error: 'clubId is required' }, { status: 400 });
    }
    if (!['new', 'replace', 'merge'].includes(mode)) {
      return Response.json({ error: 'Invalid import mode' }, { status: 400 });
    }
    if (!rawWebsite || typeof rawWebsite !== 'object') {
      return Response.json({ error: 'The bundle is missing its website definition' }, { status: 400 });
    }
    if (!Array.isArray(rawPages) || rawPages.length === 0) {
      return Response.json({ error: 'The bundle contains no pages' }, { status: 400 });
    }

    // ---- Tenant authorisation -------------------------------------------------
    if (!isPlatformAdmin(user)) {
      const membership = await getClubMembership(base44, user.email, clubId);
      if (!membership || membership.role !== 'admin') {
        return Response.json({ error: 'Forbidden: club admin access required' }, { status: 403 });
      }
    }

    const club = await base44.asServiceRole.entities.Club.get(clubId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const errors = [];
    const warnings = [];

    // ---- Assets ---------------------------------------------------------------
    const assetMap = {};
    const assetList = [];
    for (const raw of Array.isArray(rawAssets) ? rawAssets : []) {
      const sourcePath = String(raw?.source_path || '').trim();
      const fileUrl = safeUrl(raw?.file_url, false);
      if (!sourcePath) {
        errors.push({ message: 'An uploaded asset is missing its bundle path.' });
        continue;
      }
      if (!fileUrl) {
        errors.push({ message: `Asset “${sourcePath}” has no valid uploaded file URL.` });
        continue;
      }
      if (!sourcePath.startsWith('assets/')) {
        warnings.push({ message: `Asset “${sourcePath}” sits outside the assets folder.` });
      }
      assetMap[sourcePath] = fileUrl;
      assetList.push({
        source_path: sourcePath,
        file_url: fileUrl,
        original_filename: stripTags(String(raw?.original_filename || sourcePath.split('/').pop())).slice(0, 200),
        mime_type: String(raw?.mime_type || ''),
        size: Number(raw?.size || 0),
        alt_text: stripTags(String(raw?.alt_text || '')).slice(0, 300),
      });
    }

    // ---- Site level -----------------------------------------------------------
    const siteName = stripTags(String(rawWebsite.name || '')).trim().slice(0, 160);
    if (!siteName) errors.push({ message: 'The website requires a name.' });

    const siteSlug = isValidSlug(rawWebsite.slug) ? rawWebsite.slug : slugify(rawWebsite.slug || siteName);
    if (!siteSlug) errors.push({ message: 'The website requires a URL-safe slug.' });

    // ---- Pages ----------------------------------------------------------------
    const pages = [];
    const seenSlugs = new Set();
    const rawHomePages = rawPages.filter((p) => p?.is_home === true);
    if (rawHomePages.length > 1) errors.push({ message: 'More than one page is marked as the home page.' });

    rawPages.forEach((rawPage, index) => {
      const title = stripTags(String(rawPage?.title || '')).trim().slice(0, 200);
      const pageSlug = isValidSlug(rawPage?.slug) ? rawPage.slug : slugify(rawPage?.slug || title);
      if (!title) errors.push({ message: `Page ${index + 1} is missing a title.` });
      if (!pageSlug) errors.push({ message: `Page “${title || index + 1}” is missing a URL-safe slug.` });
      else if (seenSlugs.has(pageSlug)) errors.push({ message: `Duplicate page slug “${pageSlug}”.` });
      else seenSlugs.add(pageSlug);

      const rawSections = Array.isArray(rawPage?.sections) ? rawPage.sections : [];
      const sections = rawSections.map((rawSection) => {
        const type = String(rawSection?.type || '').trim();
        if (!SECTION_TYPE_KEYS.includes(type)) {
          errors.push({ message: `Page “${pageSlug || index + 1}”: unknown section type “${type}”.` });
          return null;
        }
        const rawContent = rawSection?.content && typeof rawSection.content === 'object' ? rawSection.content : {};
        collectAssetRefs(rawContent, new Set()).forEach((ref) => {
          if (!assetMap[ref]) {
            errors.push({ message: `Page “${pageSlug || index + 1}”, ${type} section: image “${ref}” is missing from the bundle.` });
          }
        });
        return {
          type,
          visible: rawSection?.visible !== false,
          content: sanitizeContent(rawContent, assetMap, warnings),
        };
      }).filter(Boolean);

      pages.push({
        title,
        slug: pageSlug,
        is_home: rawHomePages.length === 0 ? index === 0 : rawPage?.is_home === true,
        order: Number.isFinite(Number(rawPage?.order)) ? Number(rawPage.order) : index,
        visible: rawPage?.visible !== false,
        seo_title: stripTags(String(rawPage?.seo?.title || '')).slice(0, 200),
        seo_description: stripTags(String(rawPage?.seo?.description || '')).slice(0, 320),
        og_image_url: safeImageUrl(rawPage?.seo?.og_image || ''),
        sections,
      });
    });

    validateSections(pages, errors);

    // ---- Existing website / mode checks --------------------------------------
    let target = null;
    if (mode === 'new') {
      const existing = await base44.asServiceRole.entities.Website.filter({ club_id: clubId, slug: siteSlug });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.ImportLog.create({
          club_id: clubId,
          website_id: existing[0].id,
          filename: String(filename).slice(0, 200),
          mode,
          status: 'failed',
          summary: {},
          warnings: [],
          errors: [{ message: `A website with the slug “${siteSlug}” already exists for this club. Choose Replace or Merge, or change the bundle slug.` }],
          created_by: user.email,
        }).catch(() => {});
        return Response.json({
          error: `A website with the slug “${siteSlug}” already exists for this club. Choose Replace or Merge, or change the bundle slug.`,
        }, { status: 409 });
      }
    } else {
      if (!targetWebsiteId) {
        return Response.json({ error: 'Choose the website to import into' }, { status: 400 });
      }
      target = await base44.asServiceRole.entities.Website.get(targetWebsiteId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!target || target.club_id !== clubId) {
        return Response.json({ error: 'Website not found for this club' }, { status: 404 });
      }
    }

    // Nothing has been written yet — blocking errors stop here.
    if (errors.length > 0) {
      await base44.asServiceRole.entities.ImportLog.create({
        club_id: clubId,
        website_id: target?.id || '',
        filename: String(filename).slice(0, 200),
        mode,
        status: 'failed',
        summary: {},
        warnings,
        errors,
        created_by: user.email,
      }).catch(() => {});
      return Response.json({ ok: false, errors, warnings }, { status: 422 });
    }

    // ---- Sanitised site level values -----------------------------------------
    const theme = sanitizeContent(rawWebsite.theme, assetMap, warnings);
    const footer = sanitizeContent(rawWebsite.footer, assetMap, warnings);
    const settings = sanitizeContent(rawWebsite.settings, assetMap, warnings);
    const navigation = sanitizeNavigation(rawWebsite.navigation, assetMap, warnings);

    const websiteFields = {
      name: siteName,
      slug: siteSlug,
      theme,
      footer,
      site_settings: settings,
      navigation,
    };

    // ---- Writes ---------------------------------------------------------------
    let websiteId;
    if (mode === 'new') {
      const created = await base44.asServiceRole.entities.Website.create({
        ...websiteFields,
        club_id: clubId,
        status: 'draft',
        last_imported_at: new Date().toISOString(),
      });
      websiteId = created.id;
      createdWebsiteId = created.id;
    } else if (mode === 'replace') {
      const [existingPages, existingSections] = await Promise.all([
        base44.asServiceRole.entities.Page.filter({ website_id: target.id }),
        base44.asServiceRole.entities.Section.filter({ website_id: target.id }),
      ]);
      await base44.asServiceRole.entities.WebsiteVersion.create({
        website_id: target.id,
        club_id: clubId,
        snapshot: {
          site: {
            name: target.name,
            slug: target.slug,
            theme: target.theme || {},
            footer: target.footer || {},
            site_settings: target.site_settings || {},
            navigation: target.navigation || [],
          },
          pages: existingPages.map((p) => ({
            title: p.title,
            slug: p.slug,
            is_home: !!p.is_home,
            order: p.order ?? 0,
            visible: p.visible !== false,
            seo_title: p.seo_title || '',
            seo_description: p.seo_description || '',
            og_image_url: p.og_image_url || '',
            sections: existingSections
              .filter((s) => s.page_id === p.id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((s) => ({ type: s.type, visible: s.visible !== false, content: s.content || {} })),
          })),
        },
        created_by: user.email,
        note: `Automatic backup before replace import${filename ? ` (${filename})` : ''}`,
      });
      await base44.asServiceRole.entities.Website.update(target.id, {
        ...websiteFields,
        last_imported_at: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.Section.deleteMany({ website_id: target.id });
      await base44.asServiceRole.entities.Page.deleteMany({ website_id: target.id });
      websiteId = target.id;
    } else {
      websiteId = target.id;
      await base44.asServiceRole.entities.Website.update(websiteId, { last_imported_at: new Date().toISOString() });
    }

    // ---- Assets: upsert by bundle path so re-imports never duplicate ---------
    const existingAssets = await base44.asServiceRole.entities.MediaAsset.filter({ website_id: websiteId });
    const assetByPath = {};
    existingAssets.forEach((a) => { if (a.source_path) assetByPath[a.source_path] = a; });

    const summary = {
      pages_created: 0,
      pages_updated: 0,
      sections_created: 0,
      assets_created: 0,
      assets_updated: 0,
      assets_untouched: Math.max(0, existingAssets.length - assetList.filter((a) => assetByPath[a.source_path]).length),
    };

    for (const asset of assetList) {
      const existing = assetByPath[asset.source_path];
      if (existing) {
        await base44.asServiceRole.entities.MediaAsset.update(existing.id, {
          file_url: asset.file_url,
          original_filename: asset.original_filename,
          mime_type: asset.mime_type,
          size: asset.size,
          alt_text: asset.alt_text || existing.alt_text || '',
        });
        summary.assets_updated += 1;
      } else {
        await base44.asServiceRole.entities.MediaAsset.create({
          ...asset,
          website_id: websiteId,
          club_id: clubId,
        });
        summary.assets_created += 1;
      }
    }

    // ---- Pages and sections ---------------------------------------------------
    const existingPages = mode === 'merge'
      ? await base44.asServiceRole.entities.Page.filter({ website_id: websiteId })
      : [];
    const pageBySlug = {};
    existingPages.forEach((p) => { pageBySlug[p.slug] = p; });

    const bundleHome = pages.find((p) => p.is_home);
    if (mode === 'merge' && bundleHome) {
      for (const page of existingPages) {
        if (page.is_home && page.slug !== bundleHome.slug) {
          await base44.asServiceRole.entities.Page.update(page.id, { is_home: false });
        }
      }
    }

    for (const page of pages) {
      const payload = {
        website_id: websiteId,
        club_id: clubId,
        title: page.title,
        slug: page.slug,
        is_home: page.is_home,
        order: page.order,
        visible: page.visible,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        og_image_url: page.og_image_url,
      };

      let pageId;
      const existing = pageBySlug[page.slug];
      if (existing) {
        await base44.asServiceRole.entities.Page.update(existing.id, payload);
        await base44.asServiceRole.entities.Section.deleteMany({ page_id: existing.id });
        pageId = existing.id;
        summary.pages_updated += 1;
      } else {
        const created = await base44.asServiceRole.entities.Page.create(payload);
        pageId = created.id;
        summary.pages_created += 1;
      }

      if (page.sections.length > 0) {
        await base44.asServiceRole.entities.Section.bulkCreate(
          page.sections.map((section, index) => ({
            page_id: pageId,
            website_id: websiteId,
            club_id: clubId,
            type: section.type,
            order: index,
            visible: section.visible,
            content: section.content,
          })),
        );
        summary.sections_created += page.sections.length;
      }
    }

    const log = await base44.asServiceRole.entities.ImportLog.create({
      club_id: clubId,
      website_id: websiteId,
      filename: String(filename).slice(0, 200),
      mode,
      status: warnings.length > 0 ? 'partial' : 'success',
      summary,
      warnings,
      errors: [],
      created_by: user.email,
    });

    // Created successfully — no rollback needed if the response fails.
    createdWebsiteId = null;

    return Response.json({
      ok: true,
      websiteId,
      websiteSlug: siteSlug,
      mode,
      status: 'draft',
      summary,
      warnings,
      importLogId: log.id,
    });
  } catch (error) {
    if (createdWebsiteId) {
      try {
        await base44.asServiceRole.entities.Section.deleteMany({ website_id: createdWebsiteId });
        await base44.asServiceRole.entities.Page.deleteMany({ website_id: createdWebsiteId });
        await base44.asServiceRole.entities.MediaAsset.deleteMany({ website_id: createdWebsiteId });
        await base44.asServiceRole.entities.Website.delete(createdWebsiteId);
      } catch {
        // best-effort rollback so a failed import leaves nothing behind
      }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}