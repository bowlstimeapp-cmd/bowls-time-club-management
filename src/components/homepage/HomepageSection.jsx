import React from 'react';

export default function HomepageSection({ title, action, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}