import React from 'react';
import SiteButton from '../SiteButton';

export default function HeroSection({ content, siteSlug }) {
  const alignment = content.alignment === 'center' ? 'center' : content.alignment === 'right' ? 'right' : 'left';
  const alignClass = alignment === 'center' ? 'items-center text-center' : alignment === 'right' ? 'items-end text-right' : 'items-start text-left';
  const overlay = typeof content.overlay_opacity === 'number' ? content.overlay_opacity : 0.45;
  const buttons = Array.isArray(content.buttons) ? content.buttons.filter((b) => b?.label) : [];

  return (
    <section className="relative isolate overflow-hidden" style={{ backgroundColor: 'var(--ws-secondary)' }}>
      {content.background_image ? (
        <img src={content.background_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${Math.min(1, Math.max(0, overlay))})` }} />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className={`flex flex-col ${alignClass}`}>
          {content.heading && (
            <h1
              className="max-w-3xl text-3xl font-bold text-white sm:text-5xl"
              style={{ fontFamily: 'var(--ws-font-heading)', lineHeight: 1.15 }}
            >
              {content.heading}
            </h1>
          )}
          {content.subheading && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-white/90">{content.subheading}</p>
          )}
          {buttons.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {buttons.map((button, index) => (
                <SiteButton
                  key={`${button.label}-${index}`}
                  label={button.label}
                  link={button.link}
                  siteSlug={siteSlug}
                  variant={index === 0 ? 'solid' : 'outline'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}