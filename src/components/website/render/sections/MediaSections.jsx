import React from 'react';
import SectionShell from './SectionShell';

export function GallerySection({ content }) {
  const images = (Array.isArray(content.images) ? content.images : []).filter((img) => img?.image);
  const layout = content.layout || 'grid';

  if (images.length === 0) {
    return (
      <SectionShell heading={content.heading}>
        <p className="text-sm opacity-70" style={{ color: 'var(--ws-text)' }}>No photos yet.</p>
      </SectionShell>
    );
  }

  if (layout === 'carousel') {
    return (
      <SectionShell heading={content.heading}>
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {images.map((img, index) => (
            <figure key={index} className="w-72 shrink-0 snap-start">
              <img
                src={img.image}
                alt={img.alt || ''}
                className="h-48 w-full object-cover"
                style={{ borderRadius: 'var(--ws-radius)' }}
              />
              {img.caption && <figcaption className="mt-2 text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (layout === 'masonry') {
    return (
      <SectionShell heading={content.heading}>
        <div className="columns-2 gap-4 md:columns-3">
          {images.map((img, index) => (
            <figure key={index} className="mb-4 break-inside-avoid">
              <img
                src={img.image}
                alt={img.alt || ''}
                className="w-full object-cover"
                style={{ borderRadius: 'var(--ws-radius)' }}
              />
              {img.caption && <figcaption className="mt-2 text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell heading={content.heading}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((img, index) => (
          <figure key={index}>
            <img
              src={img.image}
              alt={img.alt || ''}
              className="h-48 w-full object-cover"
              style={{ borderRadius: 'var(--ws-radius)' }}
            />
            {img.caption && <figcaption className="mt-2 text-xs opacity-70" style={{ color: 'var(--ws-text)' }}>{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export function EmbedSection({ content }) {
  if (!content.embed_url) return null;
  return (
    <SectionShell heading={content.heading}>
      <div
        className="aspect-video w-full overflow-hidden border bg-black/5"
        style={{ borderRadius: 'var(--ws-radius)', borderColor: 'rgba(0,0,0,0.1)' }}
      >
        <iframe
          src={content.embed_url}
          title={content.heading || 'Embedded content'}
          className="h-full w-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </SectionShell>
  );
}