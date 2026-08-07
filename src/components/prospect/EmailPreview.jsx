import React from 'react';

export default function EmailPreview({ html }) {
  if (!html) {
    return (
      <div className="border rounded-md p-8 text-center text-gray-400 text-sm">
        Nothing to preview
      </div>
    );
  }
  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <iframe
        srcDoc={html}
        className="w-full h-[500px] border-0"
        title="Email Preview"
        sandbox=""
      />
    </div>
  );
}