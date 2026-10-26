import React from 'react';
import { cn } from '@/lib/utils';
import { GREEN_LABELS, isDualGreens, getBookingGreen } from '@/lib/rinkConfig';

/** Small Indoor / Outdoor label shown next to a rink number for dual-green clubs. */
export default function GreenBadge({ booking, club, className }) {
  const green = booking?.green_type
    || (isDualGreens(club) ? getBookingGreen(booking, club) : null);
  if (!green) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        green === 'indoor' ? 'bg-sky-100 text-sky-800' : 'bg-lime-100 text-lime-800',
        className
      )}
    >
      {GREEN_LABELS[green]}
    </span>
  );
}