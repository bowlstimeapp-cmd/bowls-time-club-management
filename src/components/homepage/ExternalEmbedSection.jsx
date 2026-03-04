import React from 'react';
import HomepageSection from './HomepageSection';

export default function ExternalEmbedSection({ title, html }) {
  if (!html) return null;
  return (
    <HomepageSection title={title || 'External Content'}>
      <div
        className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </HomepageSection>
  );
}