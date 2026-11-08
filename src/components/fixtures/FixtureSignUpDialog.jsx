import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

/** Full list of members who said they are available for one fixture. */
export default function FixtureSignUpDialog({ open, onOpenChange, fixture, competitionName, interests = [] }) {
  const sorted = [...interests].sort((a, b) =>
    (a.member_name || '').localeCompare(b.member_name || '', undefined, { sensitivity: 'base' })
  );

  const subtitle = fixture
    ? [competitionName || 'Fixture', fixture.opponent, fixture.date ? format(parseISO(fixture.date), 'EEE d MMM yyyy') : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Who wants to play</DialogTitle>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </DialogHeader>
        <div className="py-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No one has signed up yet.</p>
          ) : (
            <>
              <ul className="divide-y">
                {sorted.map((i, index) => (
                  <li key={i.id || `${i.user_email}-${index}`} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{i.member_name || i.user_email}</p>
                      <p className="text-xs text-gray-400 truncate">{i.user_email}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{index + 1}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-3 text-sm font-medium text-gray-700">
                {sorted.length} {sorted.length === 1 ? 'member signed up' : 'members signed up'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}