import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Pencil, Target } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { isElevationActive, hasElevatedSelectorAccess, hasElevatedScorerAccess } from '@/lib/selectionAccess';

// Matches where this member was given temporary selector / live scoring access.
// Nothing is shown once the grant has lapsed at the end of match day.
export default function AssignedMatchesCard({ selections = [], userEmail, clubId }) {
  const rows = useMemo(() => (selections || [])
    .filter((s) => s && !s.is_archived && isElevationActive(s))
    .map((s) => ({
      selection: s,
      selector: hasElevatedSelectorAccess(s, userEmail),
      scorer: hasElevatedScorerAccess(s, userEmail),
    }))
    .filter((r) => r.selector || r.scorer)
    .sort((a, b) => String(a.selection.match_date || '').localeCompare(String(b.selection.match_date || ''))),
    [selections, userEmail]
  );

  if (rows.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-4 h-4 text-amber-700" />
        <h2 className="text-sm font-semibold text-amber-900">Assigned to you</h2>
      </div>
      <div className="space-y-2">
        {rows.map(({ selection, selector, scorer }) => (
          <div
            key={selection.id}
            className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{selection.competition}</span>
                {selection.opponent && (
                  <span className="text-sm text-gray-700">vs {selection.opponent}</span>
                )}
                {selector && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Selector</Badge>
                )}
                {scorer && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Live Scorer</Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                <span>{format(parseISO(selection.match_date), 'EEE d MMM yyyy')}</span>
                {selection.match_start_time && <span>• {selection.match_start_time}</span>}
                <span>• access ends after match day</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selector && (
                <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit Team
                  </Button>
                </Link>
              )}
              <Link to={createPageUrl('LiveScoring') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Target className="w-3.5 h-3.5 mr-1.5" />
                  Live Scoring
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}