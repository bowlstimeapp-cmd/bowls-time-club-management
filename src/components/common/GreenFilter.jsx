import React from 'react';
import { cn } from '@/lib/utils';
import { isDualGreens, GREEN_LABELS } from '@/lib/rinkConfig';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'indoor', label: GREEN_LABELS.indoor },
  { value: 'outdoor', label: GREEN_LABELS.outdoor },
];

/** Indoor / outdoor filter. Only rendered for clubs that run both greens. */
export default function GreenFilter({ club, value, onChange, label = 'Show', className }) {
  if (!isDualGreens(club)) return null;

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {label && <span className="text-sm text-gray-600 font-medium">{label}:</span>}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              value === option.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}