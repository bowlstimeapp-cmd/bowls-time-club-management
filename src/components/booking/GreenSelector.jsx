import React from 'react';
import { cn } from '@/lib/utils';
import { GREEN_LABELS } from '@/lib/rinkConfig';

/** Indoor / outdoor green switch — only rendered for clubs that run both greens. */
export default function GreenSelector({ greens = [], value, onChange, className }) {
  if (greens.length < 2) return null;

  return (
    <div className={cn('inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1', className)}>
      {greens.map((green) => (
        <button
          key={green}
          type="button"
          onClick={() => onChange(green)}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            green === value
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {GREEN_LABELS[green]} Green
        </button>
      ))}
    </div>
  );
}