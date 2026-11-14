import React from 'react';
import SectionShell, { RICH_TEXT_CLASS } from './SectionShell';
import SiteButton from '../SiteButton';

export function RichTextSection({ content }) {
  return (
    <SectionShell heading={content.heading}>
      <div
        className={`${RICH_TEXT_CLASS} max-w-3xl ${content.alignment === 'center' ? 'mx-auto text-center' : ''}`}
        style={{ color: 'var(--ws-text)' }}
        dangerouslySetInnerHTML={{ __html: content.body_html || '' }}
      />
    </SectionShell>
  );
}

export function ImageTextSection({ content, siteSlug }) {
  const imageFirst = content.image_position !== 'right';
  return (
    <SectionShell>
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className={imageFirst ? 'md:order-1' : 'md:order-2'}>
          {content.image && (
            <img
              src={content.image}
              alt={content.image_alt || ''}
              className="h-full w-full object-cover"
              style={{ borderRadius: 'var(--ws-radius)' }}
            />
          )}
        </div>
        <div className={imageFirst ? 'md:order-2' : 'md:order-1'}>
          {content.heading && (
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font-heading)' }}>
              {content.heading}
            </h2>
          )}
          {content.body_html && (
            <div
              className={`${RICH_TEXT_CLASS} mt-4`}
              style={{ color: 'var(--ws-text)' }}
              dangerouslySetInnerHTML={{ __html: content.body_html }}
            />
          )}
          {content.button?.label && (
            <div className="mt-6">
              <SiteButton label={content.button.label} link={content.button.link} siteSlug={siteSlug} />
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

export function CtaBannerSection({ content, siteSlug }) {
  return (
    <SectionShell>
      <div
        className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between"
        style={{ backgroundColor: 'var(--ws-secondary)', borderRadius: 'var(--ws-radius)' }}
      >
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: 'var(--ws-font-heading)' }}>
            {content.heading}
          </h2>
          {content.text && <p className="mt-2 max-w-2xl text-sm text-white/80">{content.text}</p>}
        </div>
        {content.button?.label && (
          <SiteButton label={content.button.label} link={content.button.link} siteSlug={siteSlug} />
        )}
      </div>
    </SectionShell>
  );
}

export function SpacerSection({ content }) {
  const height = content.height === 'small' ? 'h-6' : content.height === 'large' ? 'h-24' : 'h-12';
  return <div className={height} aria-hidden="true" />;
}

export function DividerSection() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <hr className="border-0 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
    </div>
  );
}