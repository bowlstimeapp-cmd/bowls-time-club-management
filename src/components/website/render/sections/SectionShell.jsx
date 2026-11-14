import React from 'react';

// Shared typography for rendered rich-text bodies (no typography plugin in this project).
export const RICH_TEXT_CLASS =
  'space-y-3 text-[15px] leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_img]:rounded-lg [&_strong]:font-semibold';

export default function SectionShell({ heading, intro, children, tinted = false }) {
  return (
    <section className={tinted ? 'py-14 sm:py-16' : 'py-12 sm:py-14'} style={tinted ? { backgroundColor: 'rgba(0,0,0,0.03)' } : undefined}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {heading && (
          <h2
            className="text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font-heading)' }}
          >
            {heading}
          </h2>
        )}
        {intro && (
          <p className="mt-3 max-w-2xl text-base opacity-75" style={{ color: 'var(--ws-text)' }}>
            {intro}
          </p>
        )}
        <div className={heading || intro ? 'mt-8' : ''}>{children}</div>
      </div>
    </section>
  );
}