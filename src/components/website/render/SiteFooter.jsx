import React from 'react';
import { siteHref } from '@/lib/website/renderHelpers';
import SmartLink from './SmartLink';

function colHref(link, siteSlug) {
  return link?.external_url || siteHref(link?.page_slug, siteSlug);
}

export default function SiteFooter({ site, siteSlug }) {
  const footer = site?.footer || {};
  const settings = site?.site_settings || {};
  const columns = Array.isArray(footer.columns) ? footer.columns : [];
  const socials = Object.entries(settings.social_links || {}).filter(([, url]) => !!url);

  return (
    <footer style={{ backgroundColor: 'var(--ws-secondary)', color: '#ffffff' }} className="mt-0">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="text-lg font-bold" style={{ fontFamily: 'var(--ws-font-heading)' }}>
              {settings.site_title || site?.name || ''}
            </div>
            {footer.text && <p className="mt-3 max-w-md text-sm text-white/75">{footer.text}</p>}
            {(settings.contact_email || settings.contact_phone) && (
              <div className="mt-4 space-y-1 text-sm text-white/80">
                {settings.contact_phone && <div>{settings.contact_phone}</div>}
                {settings.contact_email && (
                  <a href={`mailto:${settings.contact_email}`} className="underline-offset-2 hover:underline">
                    {settings.contact_email}
                  </a>
                )}
              </div>
            )}
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
                {socials.map(([network, url]) => (
                  <a key={network} href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white">
                    {network}
                  </a>
                ))}
              </div>
            )}
          </div>

          {columns.map((column) => (
            <div key={column.title || 'links'}>
              {column.title && <div className="text-sm font-semibold uppercase tracking-wide text-white/60">{column.title}</div>}
              <div className="mt-3 flex flex-col gap-2">
                {(column.links || []).filter((link) => link?.label).map((link) => (
                  <SmartLink
                    key={link.label}
                    href={colHref(link, siteSlug)}
                    className="text-sm text-white/80 hover:text-white"
                  >
                    {link.label}
                  </SmartLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {footer.copyright && (
          <div className="mt-10 border-t border-white/15 pt-6 text-xs text-white/60">{footer.copyright}</div>
        )}
      </div>
    </footer>
  );
}