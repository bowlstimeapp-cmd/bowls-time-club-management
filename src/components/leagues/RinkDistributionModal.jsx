import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function RinkDistributionModal({ open, onClose, fixtures, teams, rinkCount, leagueRinks, league, onRegenerate, onConfirm, isLoading }) {
  if (!fixtures || !teams) return null;

  // Only show rinks that are used in the fixtures (i.e. the selected league rinks)
  const usedRinks = leagueRinks && leagueRinks.length > 0
    ? leagueRinks.slice().sort((a, b) => a - b)
    : Array.from(new Set(fixtures.map(f => f.rink_number))).sort((a, b) => a - b);

  // Build distribution: teamId -> rinkNumber -> count
  const distribution = {};
  teams.forEach(t => {
    distribution[t.id] = {};
    usedRinks.forEach(r => { distribution[t.id][r] = 0; });
  });

  fixtures.forEach(f => {
    if (distribution[f.home_team_id]) distribution[f.home_team_id][f.rink_number] = (distribution[f.home_team_id][f.rink_number] || 0) + 1;
    if (distribution[f.away_team_id]) distribution[f.away_team_id][f.rink_number] = (distribution[f.away_team_id][f.rink_number] || 0) + 1;
  });

  const isDoubleRink = league?.is_double_rink;
  const groupedTies = [];
  const nonAdjacentTies = [];
  if (isDoubleRink) {
    const tieMap = {};
    fixtures.forEach(f => {
      if (!f.tie_id) return;
      if (!tieMap[f.tie_id]) tieMap[f.tie_id] = { id: f.tie_id, home_team_id: f.home_team_id, away_team_id: f.away_team_id, match_date: f.match_date, legs: [], nonAdjacent: false };
      tieMap[f.tie_id].legs.push({ leg: f.leg || 1, rink_number: f.rink_number, nonAdjacent: f._nonAdjacent });
      if (f._nonAdjacent) {
        tieMap[f.tie_id].nonAdjacent = true;
        nonAdjacentTies.push(f.tie_id);
      }
    });
    Object.values(tieMap).forEach(tie => {
      tie.legs.sort((a, b) => a.leg - b.leg);
      groupedTies.push(tie);
    });
    groupedTies.sort((a, b) => a.match_date.localeCompare(b.match_date));
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onClose) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Fixture Distribution Preview</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 mb-4">
          Review how matches are distributed across rinks before confirming. Each cell shows the number of games that team plays on that rink.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-50 text-left">Team</th>
                {usedRinks.map(r => (
                  <th key={r} className="border p-2 bg-gray-50 text-center">Rink {r}</th>
                ))}
                <th className="border p-2 bg-gray-50 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => {
                const total = usedRinks.reduce((sum, r) => sum + (distribution[team.id]?.[r] || 0), 0);
                return (
                  <tr key={team.id}>
                    <td className="border p-2 font-medium">{team.name}</td>
                    {usedRinks.map(r => {
                      const count = distribution[team.id]?.[r] || 0;
                      return (
                        <td key={r} className={`border p-2 text-center ${count > 0 ? 'text-emerald-700 font-medium' : 'text-gray-300'}`}>
                          {count || '—'}
                        </td>
                      );
                    })}
                    <td className="border p-2 text-center font-semibold text-gray-700">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Total fixtures generated: <strong>{fixtures.length}</strong>
        </div>

        {isDoubleRink && groupedTies.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Meetings (Double Rink)</h3>
            {nonAdjacentTies.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {nonAdjacentTies.length} meeting(s) could not be placed on strictly adjacent rinks.
              </div>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {groupedTies.map(tie => {
                const homeTeam = teams.find(t => t.id === tie.home_team_id);
                const awayTeam = teams.find(t => t.id === tie.away_team_id);
                return (
                  <div key={tie.id} className={`border rounded p-2 ${tie.nonAdjacent ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {format(parseISO(tie.match_date), 'd MMM yyyy')} — {homeTeam?.name} vs {awayTeam?.name}
                      {tie.nonAdjacent && <span className="ml-2 text-amber-600 font-semibold">⚠ Non-adjacent</span>}
                    </div>
                    <div className="flex gap-3">
                      {tie.legs.map(leg => (
                        <Badge key={leg.leg} variant="outline" className={leg.nonAdjacent ? 'border-amber-300' : ''}>
                          Leg {leg.leg} — Rink {leg.rink_number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onRegenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerate
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Confirm Fixtures
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}