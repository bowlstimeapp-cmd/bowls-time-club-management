import React from 'react';
import { Link } from 'react-router-dom';
import { isSpecialHref } from '@/lib/website/renderHelpers';

// Renders an in-site route as a router Link, external/mail/tel/anchor links as plain anchors.
export default function SmartLink({ href, className, style, children, ...rest }) {
  if (!href) {
    return <span className={className} style={style}>{children}</span>;
  }
  if (isSpecialHref(href)) {
    return (
      <a href={href} className={className} style={style} rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} style={style} {...rest}>
      {children}
    </Link>
  );
}