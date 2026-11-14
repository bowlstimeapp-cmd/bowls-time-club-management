import React from 'react';
import SectionShell from './SectionShell';
import SmartLink from '../SmartLink';
import { siteHref } from '@/lib/website/renderHelpers';

export function FeatureCardsSection({ content, siteSlug }) {
  const cards = Array.isArray(content.cards) ? content.cards : [];
  return (
    <SectionShell heading={content.heading} intro={content.intro}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const href = siteHref(card.link, siteSlug);
          return (
            <div
              key={`${card.title || index}`}
              className="flex flex-col border p-6"
              style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#ffffff' }}
            >
              {card.image ? (
                <img src={card.image} alt={card.title || ''} className="mb-4 h-40 w-full object-cover" style={{ borderRadius: 'var(--ws-radius)' }} />
              ) : card.icon ? (
                <div className="mb-3 text-2xl" aria-hidden="true">{card.icon}</div>
              ) : null}
              {card.title && (
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font-heading)' }}>
                  {card.title}
                </h3>
              )}
              {card.text && <p className="mt-2 flex-1 text-sm opacity-75" style={{ color: 'var(--ws-text)' }}>{card.text}</p>}
              {href && (
                <SmartLink href={href} className="mt-4 text-sm font-semibold" style={{ color: 'var(--ws-primary)' }}>
                  Read more →
                </SmartLink>
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function SponsorsSection({ content, siteSlug }) {
  const items = Array.isArray(content.items) ? content.items : [];
  return (
    <SectionShell heading={content.heading} tinted>
      <div className="flex flex-wrap items-center gap-8">
        {items.map((item) => (
          <SmartLink
            key={item.name}
            href={siteHref(item.link, siteSlug)}
            className="opacity-80 transition-opacity hover:opacity-100"
          >
            {item.logo ? (
              <img src={item.logo} alt={item.name} className="h-12 w-auto object-contain" />
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>{item.name}</span>
            )}
          </SmartLink>
        ))}
      </div>
    </SectionShell>
  );
}

export function DocumentsSection({ content }) {
  const items = Array.isArray(content.items) ? content.items : [];
  return (
    <SectionShell heading={content.heading}>
      <div className="divide-y border" style={{ borderColor: 'rgba(0,0,0,0.1)', borderRadius: 'var(--ws-radius)' }}>
        {items.map((item) => (
          <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>{item.title}</div>
              {item.description && <div className="mt-1 text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>{item.description}</div>}
            </div>
            {item.file && (
              <a
                href={item.file}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm font-semibold"
                style={{ color: 'var(--ws-primary)' }}
              >
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}