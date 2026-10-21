import React from 'react';
import { Link } from 'react-router-dom';

// Renders one paragraph, bolding a leading clause number (e.g. "1.1") and
// replacing the [LINK] placeholder with a link to the Privacy Notice page.
function Para({ text }) {
  const match = text.match(/^(\d+(?:\.\d+)+)\s+(.*)$/s);
  const number = match ? match[1] : null;
  const body = match ? match[2] : text;

  const bodyNode = body.includes('[LINK]') ? (
    body.split('[LINK]').map((part, i, arr) => (
      <React.Fragment key={i}>
        {part}
        {i < arr.length - 1 && (
          <Link to="/PrivacyNotice" className="text-emerald-700 underline hover:text-emerald-800">
            Privacy Notice
          </Link>
        )}
      </React.Fragment>
    ))
  ) : body;

  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      {number && <span className="font-semibold text-gray-900">{number} </span>}
      {bodyNode}
    </p>
  );
}

export default function LegalDoc({ title, lastUpdated, sections, crossLinkLabel, crossLinkTo }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Last updated: {lastUpdated}</p>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {sections.map((section) => (
            <section key={section.heading} className="p-4 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{section.heading}</h2>
              <div className="space-y-3">
                {section.items.map((item, i) => {
                  if (item.t === 'h') {
                    return (
                      <h3 key={i} className="text-sm font-semibold text-gray-800">{item.text}</h3>
                    );
                  }
                  if (item.t === 'ul') {
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-1.5">
                        {item.items.map((li, j) => (
                          <li key={j} className="text-sm text-gray-700 leading-relaxed">{li}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <Para key={i} text={item.text} />;
                })}
              </div>
            </section>
          ))}
        </div>

        {crossLinkLabel && (
          <p className="text-sm text-gray-500 text-center mt-6">
            See also our{' '}
            <Link to={crossLinkTo} className="text-emerald-700 underline hover:text-emerald-800">
              {crossLinkLabel}
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}