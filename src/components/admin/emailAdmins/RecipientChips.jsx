import React from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { joinNaturally } from '@/lib/mergeTags';

export default function RecipientChips({ recipients = [], onRemove, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-gray-600">Recipients</Label>
        <span className="text-xs text-gray-400">
          {recipients.length} unique admin{recipients.length === 1 ? '' : 's'}
        </span>
      </div>

      {recipients.length === 0 ? (
        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-md px-3 py-3">
          No recipients selected yet
        </p>
      ) : (
        <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 border border-gray-200 rounded-md p-2 bg-gray-50">
          {recipients.map(r => {
            const clubs = joinNaturally(r.club_names);
            return (
              <span
                key={r.email.toLowerCase()}
                className="inline-flex items-center gap-1 max-w-full bg-white border border-gray-200 rounded-full pl-2.5 pr-1 py-1 text-xs text-gray-700"
              >
                <span className="truncate">
                  {r.name || r.email}
                  {clubs ? ` - ${clubs}` : ''}{' '}
                  <span className="text-gray-400">({r.email})</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(r.email)}
                  disabled={disabled}
                  aria-label={`Remove ${r.email}`}
                  className="shrink-0 min-h-0 h-4 w-4 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}