import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { canManageClubWebsite } from '../../shared/websiteAuth.ts';
import { buildSiteSnapshot } from '../../shared/websiteSnapshot.ts';

// Publishing copies the current draft into a new WebsiteVersion snapshot and points the
// Website at it. The public renderer only ever reads that snapshot, so editing a draft
// never changes the live site until the club publishes again.
export default async function (req) {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const websiteId = String(body?.websiteId || '');
  if (!websiteId) return Response.json({ error: 'websiteId is required' }, { status: 400 });

  const website = await base44.asServiceRole.entities.Website
    .get(websiteId)
    .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!website) return Response.json({ error: 'Website not found' }, { status: 404 });

  const allowed = await canManageClubWebsite(base44, user, website.club_id);
  if (!allowed) return Response.json({ error: 'Forbidden: club admin access required' }, { status: 403 });

  const [pages, sections] = await Promise.all([
    base44.asServiceRole.entities.Page.filter({ website_id: websiteId }),
    base44.asServiceRole.entities.Section.filter({ website_id: websiteId }),
  ]);

  if (pages.length === 0) {
    return Response.json({ error: 'This website has no pages to publish yet.' }, { status: 400 });
  }

  const snapshot = buildSiteSnapshot(website, pages, sections);

  const version = await base44.asServiceRole.entities.WebsiteVersion.create({
    website_id: websiteId,
    club_id: website.club_id,
    snapshot,
    created_by: user.email,
    note: String(body?.note || '').slice(0, 300) || 'Published from the website editor',
  });

  await base44.asServiceRole.entities.Website.update(websiteId, {
    status: 'published',
    published_version_id: version.id,
  });

  return Response.json({
    ok: true,
    websiteId,
    versionId: version.id,
    slug: website.slug,
    pages: snapshot.pages.length,
    published_at: new Date().toISOString(),
  });
}