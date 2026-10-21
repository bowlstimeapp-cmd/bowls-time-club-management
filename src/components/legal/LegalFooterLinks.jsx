import React from 'react';
import { Link } from 'react-router-dom';

export default function LegalFooterLinks() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
      <Link to="/PrivacyNotice" className="hover:text-gray-700 hover:underline">
        Privacy Notice
      </Link>
      <span aria-hidden="true">&middot;</span>
      <Link to="/TermsOfService" className="hover:text-gray-700 hover:underline">
        Terms of Service
      </Link>
    </div>
  );
}