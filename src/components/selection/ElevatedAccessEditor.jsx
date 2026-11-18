import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, KeyRound } from 'lucide-react';
import SearchableMemberSelect from '@/components/selection/SearchableMemberSelect';

const memberLabel = (m) =>
  m?.first_name && m?.surname ? `${m.first_name} ${m.surname}` : (m?.user_name || m?.user_email || '');

function AccessSection({ title, help, candidates, list, onAdd, onRemove, addLabel }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mb-2">{help}</p>
      <SearchableMemberSelect
        members={candidates}
        value={null}
        onValueChange={(email) => { if (email) onAdd(email); }}
        getMemberName={memberLabel}
        getMemberNameByEmail={(email) => email}
        isAvailableFn={() => true}
        isUnavailableOnDateFn={() => false}
        placeholder={addLabel}
      />
      {list.length > 0 && (
        <ul className="mt-2 space-y-1">
          {list.map((person) => (
            <li
              key={person.email}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-1.5"
            >
              <span className="text-sm text-gray-900 truncate">{person.name || person.email}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600"
                onClick={() => onRemove(person)}
                aria-label={`Remove ${person.name || person.email}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Extra Access for this Match — per-selection, time-bound elevation.
 * Members listed here can edit (selectors) or live score (scorers) this one
 * selection until the end of match day. ClubMembership.role is never changed.
 */
export default function ElevatedAccessEditor({
  selectorCandidates,
  scorerCandidates,
  selectors,
  scorers,
  onAddSelector,
  onRemoveSelector,
  onAddScorer,
  onRemoveScorer,
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          Extra Access for this Match
        </CardTitle>
        <p className="text-xs text-gray-500">
          Gives these members access to this selection only, until the end of match day. It never changes their club role.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <AccessSection
          title="Additional Selectors"
          help="These members can edit this selection until the end of match day."
          addLabel="Add a selector"
          candidates={selectorCandidates}
          list={selectors}
          onAdd={onAddSelector}
          onRemove={onRemoveSelector}
        />
        <AccessSection
          title="Additional Live Scorers"
          help="These members can enter live scores for this match until the end of match day."
          addLabel="Add a live scorer"
          candidates={scorerCandidates}
          list={scorers}
          onAdd={onAddScorer}
          onRemove={onRemoveScorer}
        />
      </CardContent>
    </Card>
  );
}