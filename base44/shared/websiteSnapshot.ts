// Builds the immutable snapshot stored on a WebsiteVersion.
// Shared by the importer (automatic backup before a replace) and the publish action.

export function buildSiteSnapshot(website, pages, sections) {
  const allSections = Array.isArray(sections) ? sections : [];
  const orderedPages = [...(pages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    site: {
      name: website?.name || '',
      slug: website?.slug || '',
      theme: website?.theme || {},
      footer: website?.footer || {},
      site_settings: website?.site_settings || {},
      navigation: website?.navigation || [],
    },
    pages: orderedPages.map((page) => ({
      title: page.title,
      slug: page.slug,
      is_home: !!page.is_home,
      order: page.order ?? 0,
      visible: page.visible !== false,
      seo_title: page.seo_title || '',
      seo_description: page.seo_description || '',
      og_image_url: page.og_image_url || '',
      sections: allSections
        .filter((section) => section.page_id === page.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((section) => ({
          type: section.type,
          visible: section.visible !== false,
          content: section.content || {},
        })),
    })),
  };
}