import React from 'react';
import { siteHref } from '@/lib/website/renderHelpers';
import SmartLink from './SmartLink';

function navHref(item, siteSlug) {
  return item?.external_url || siteHref(item?.page_slug, siteSlug);
}

export default function SiteHeader({ site, siteSlug, currentPageSlug }) {
  const settings = site?.site_settings || {};
  const nav = Array.isArray(site?.navigation) ? site.navigation.filter((item) => item?.label) : [];
  const homeHref = siteHref('/', siteSlug);
  const title = settings.site_title || site?.name || '';

  return (
    <header className="sticky top-0 z-30 border-b" style={{ backgroundColor: 'var(--ws-bg)', borderColor: 'rgba(0,0,0,0.08)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <SmartLink href={homeHref} className="flex min-w-0 items-center gap-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={title} className="h-10 w-10 shrink-0 object-contain" />
          ) : null}
          <span
            className="truncate text-lg font-bold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font-heading)' }}
          >
            {title}
          </span>
        </SmartLink>

        {nav.length > 0 && (
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = item.page_slug && item.page_slug === currentPageSlug;
              return (
                <div key={item.label} className="relative group">
                  <SmartLink
                    href={navHref(item, siteSlug)}
                    className="block px-3 py-2 text-sm font-medium"
                    style={{ color: active ? 'var(--ws-primary)' : 'var(--ws-text)' }}
                  >
                    {item.label}
                  </SmartLink>
                  {Array.isArray(item.children) && item.children.length > 0 && (
                    <div
                      className="absolute left-0 top-full hidden min-w-[180px] flex-col rounded-md border bg-white py-1 shadow-lg group-hover:flex"
                      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                    >
                      {item.children.filter((child) => child?.label).map((child) => (
                        <SmartLink
                          key={child.label}
                          href={navHref(child, siteSlug)}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {child.label}
                        </SmartLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Mobile navigation — plain wrapping row so it works without JS menus */}
      {nav.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 md:hidden" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {nav.map((item) => (
            <SmartLink
              key={item.label}
              href={navHref(item, siteSlug)}
              className="py-1 text-sm font-medium"
              style={{ color: item.page_slug && item.page_slug === currentPageSlug ? 'var(--ws-primary)' : 'var(--ws-text)' }}
            >
              {item.label}
            </SmartLink>
          ))}
        </div>
      )}
    </header>
  );
}