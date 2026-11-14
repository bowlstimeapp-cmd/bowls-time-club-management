import React from 'react';
import { siteHref } from '@/lib/website/renderHelpers';
import SmartLink from './SmartLink';

export default function SiteButton({ label, link, siteSlug, variant = 'solid' }) {
  if (!label) return null;
  const style = variant === 'outline'
    ? { border: '2px solid var(--ws-primary)', color: 'var(--ws-primary)', backgroundColor: 'transparent', borderRadius: 'var(--ws-radius)' }
    : { backgroundColor: 'var(--ws-primary)', color: '#ffffff', borderRadius: 'var(--ws-radius)' };

  return (
    <SmartLink
      href={siteHref(link, siteSlug)}
      style={style}
      className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
    >
      {label}
    </SmartLink>
  );
}