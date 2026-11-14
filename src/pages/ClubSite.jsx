import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Globe, Eye } from 'lucide-react';
import SiteHeader from '@/components/website/render/SiteHeader';
import SiteFooter from '@/components/website/render/SiteFooter';
import SectionRenderer from '@/components/website/render/SectionRenderer';
import { themeVars, findPage } from '@/lib/website/renderHelpers';

function SiteMessage({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
          <Globe className="h-7 w-7 text-gray-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <div className="mt-2 text-sm text-gray-600">{children}</div>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-emerald-700 underline">
          Back to Bowls Time
        </Link>
      </div>
    </div>
  );
}

export default function ClubSite() {
  const { siteSlug, pageSlug } = useParams();
  const [searchParams] = useSearchParams();
  const previewRequested = searchParams.get('preview') === '1';
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: website, isLoading: websiteLoading } = useQuery({
    queryKey: ['sitePageBySlug', siteSlug],
    queryFn: async () => {
      const rows = await base44.entities.Website.filter({ slug: siteSlug });
      return rows[0] || null;
    },
  });

  const publishedVersionId = website?.published_version_id;
  const { data: version, isLoading: versionLoading } = useQuery({
    queryKey: ['siteVersion', publishedVersionId],
    queryFn: () => base44.entities.WebsiteVersion.get(publishedVersionId),
    enabled: !!publishedVersionId,
  });

  // Draft preview — only club admins see unpublished content.
  const { data: canPreview } = useQuery({
    queryKey: ['sitePreviewAccess', website?.club_id, user?.email],
    enabled: previewRequested && !!website?.club_id && !!user?.email,
    queryFn: async () => {
      if (user.role === 'admin') return true;
      const rows = await base44.entities.ClubMembership.filter({
        club_id: website.club_id,
        user_email: user.email,
        status: 'approved',
      });
      return rows[0]?.role === 'admin';
    },
  });

  const allowDraft = previewRequested && canPreview === true;

  const { data: draftPages } = useQuery({
    queryKey: ['siteDraftPages', website?.id],
    queryFn: () => base44.entities.Page.filter({ website_id: website.id }),
    enabled: allowDraft,
  });

  const { data: draftSections } = useQuery({
    queryKey: ['siteDraftSections', website?.id],
    queryFn: () => base44.entities.Section.filter({ website_id: website.id }),
    enabled: allowDraft,
  });

  const draftSnapshot = useMemo(() => {
    if (!website || !draftPages) return null;
    const sections = draftSections || [];
    return {
      site: {
        name: website.name,
        slug: website.slug,
        theme: website.theme || {},
        footer: website.footer || {},
        site_settings: website.site_settings || {},
        navigation: website.navigation || [],
      },
      pages: [...draftPages]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((page) => ({
          title: page.title,
          slug: page.slug,
          is_home: !!page.is_home,
          order: page.order ?? 0,
          visible: page.visible !== false,
          seo_title: page.seo_title || '',
          seo_description: page.seo_description || '',
          sections: sections
            .filter((section) => section.page_id === page.id)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((section) => ({ type: section.type, visible: section.visible !== false, content: section.content || {} })),
        })),
    };
  }, [website, draftPages, draftSections]);

  const previewing = allowDraft && !!draftSnapshot;
  const snapshot = previewing ? draftSnapshot : version?.snapshot || null;
  const page = useMemo(() => (snapshot ? findPage(snapshot, pageSlug) : null), [snapshot, pageSlug]);

  useEffect(() => {
    if (!snapshot || !page) return;
    const title = page.seo_title || snapshot.site?.site_settings?.seo_title || snapshot.site?.name || 'Club website';
    document.title = title;
    const description = page.seo_description || snapshot.site?.site_settings?.seo_description || '';
    if (!description) return;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [snapshot, page]);

  const pageMissing = !!snapshot && !!pageSlug && !page;

  useEffect(() => {
    if (!pageMissing) return;
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'prerender-status-code');
    meta.setAttribute('content', '404');
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [pageMissing]);

  const waitingForUser = previewRequested && user === undefined;

  if (websiteLoading || waitingForUser || (publishedVersionId && versionLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!website) {
    return (
      <SiteMessage title="Website not found">
        There is no club website at this address.
      </SiteMessage>
    );
  }

  if (!snapshot) {
    return (
      <SiteMessage title="This website isn't published yet">
        The club is still working on it. If you're a club admin, you can
        <Link to={`/site/${website.slug}?preview=1`} className="mx-1 font-medium text-emerald-700 underline">preview the draft</Link>.
      </SiteMessage>
    );
  }

  if (!page) {
    return (
      <SiteMessage title="Page not found">
        {pageMissing ? 'That page does not exist on this website.' : 'This website has no pages yet.'}
      </SiteMessage>
    );
  }

  return (
    <div
      style={{
        ...themeVars(snapshot.site?.theme),
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font-body)',
        minHeight: '100vh',
      }}
    >
      {previewing && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
          <Eye className="h-3.5 w-3.5" />
          Draft preview — this is not what the public sees until you publish.
        </div>
      )}

      <SiteHeader site={snapshot.site} siteSlug={siteSlug} currentPageSlug={page.slug} />

      <main>
        {(page.sections || []).map((section, index) => (
          <SectionRenderer
            key={`${section.type}-${index}`}
            section={section}
            siteSlug={siteSlug}
            clubId={website.club_id}
          />
        ))}
      </main>

      <SiteFooter site={snapshot.site} siteSlug={siteSlug} />
    </div>
  );
}