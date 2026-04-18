import React, { useState } from 'react';
import { Lightbulb, ShieldCheck, BookOpen } from 'lucide-react';
import RoadmapDoc from './docs/RoadmapDoc';
import FeatureGuideDoc from './docs/FeatureGuideDoc';
import PrivacyNoticeDoc from './docs/PrivacyNoticeDoc';

const TABS = [
  { id: 'roadmap', label: 'Feature Roadmap', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'guide', label: 'Feature Guide', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy Notice', icon: <ShieldCheck className="w-4 h-4" /> },
];

export default function PlatformDocuments() {
  const [activeDoc, setActiveDoc] = useState('roadmap');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveDoc(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDoc === t.id ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeDoc === 'roadmap' && <RoadmapDoc />}
      {activeDoc === 'guide' && <FeatureGuideDoc />}
      {activeDoc === 'privacy' && <PrivacyNoticeDoc />}
    </div>
  );
}