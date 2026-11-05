import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import CopyBlock from './CopyBlock';
import { COPY_ASSETS } from './marketingPlanData';

const CATEGORIES = ['All', 'Outreach', 'Partnership', 'Social', 'Press', 'Committee', 'Objections', 'Referral', 'Website'];

export default function CopyPanel() {
  const [filter, setFilter] = useState('All');
  const assets = filter === 'All' ? COPY_ASSETS : COPY_ASSETS.filter(a => a.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === cat
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Rule one:</span> change at least one line in every email so it could only have been sent to that club. Mail-merge is the fastest way to get ignored.
        </p>
      </div>

      <div className="space-y-3">
        {assets.map(asset => <CopyBlock key={asset.id} asset={asset} />)}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{assets.length} assets</Badge>
        <Badge variant="outline">Swap every [bracket] before sending</Badge>
      </div>
    </div>
  );
}