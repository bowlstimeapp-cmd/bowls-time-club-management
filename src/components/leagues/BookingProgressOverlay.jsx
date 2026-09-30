import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

const PHASE_LABELS = {
  cancelling: 'Cancelling existing rink bookings',
  deleting_fixtures: 'Deleting old fixtures',
  creating: 'Booking rinks',
  linking: 'Linking bookings to fixtures',
  updating: 'Updating rink allocations',
};

// Fixed overlay showing batched booking/booking-cleanup progress
export default function BookingProgressOverlay({ progress }) {
  if (!progress) return null;
  const { done, total, phase } = progress;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-600" />
        <p className="font-medium text-gray-900 mb-1">{PHASE_LABELS[phase] || 'Working'}…</p>
        <p className="text-sm text-gray-500 mb-3">{done} of {total}</p>
        <Progress value={pct} className="h-2" />
      </div>
    </div>
  );
}