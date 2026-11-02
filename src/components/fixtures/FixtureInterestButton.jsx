import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Star toggle a member uses to mark themselves interested in a fixture.
 * `count` (admin/selector view) shows how many members are interested.
 */
export default function FixtureInterestButton({ interested, count = 0, onToggle, disabled = false, showCount = false }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (disabled || busy) return;
    setBusy(true);
    try {
      await onToggle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      title={
        disabled
          ? 'This fixture has passed'
          : interested
            ? "I'm available — tap to withdraw"
            : "I'm available for this fixture"
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        interested
          ? 'border-amber-300 bg-amber-50 text-amber-700'
          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
        (disabled || busy) && 'opacity-60 cursor-not-allowed'
      )}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Star className={cn('w-3.5 h-3.5', interested && 'fill-amber-400 text-amber-500')} />
      )}
      {showCount ? (
        <span>{count}</span>
      ) : (
        <span>{interested ? 'Available' : "I'm available"}</span>
      )}
    </button>
  );
}