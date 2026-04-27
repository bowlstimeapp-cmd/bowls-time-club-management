import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';

export default function LeagueScoresModal({ open, onClose, league, fixtures, teams, clubId }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (!open || !league) return;
    const init = {};
    fixtures.filter(f => f.league_id === league.id).forEach(f => {
      init[f.id] = {
        home: f.home_score?.toString() ?? '',
        away: f.away_score?.toString() ?? '',
        home_sets: f.home_sets?.toString() ?? '',
        away_sets: f.away_sets?.toString() ?? '',
      };
    });
    setScores(init);
  }, [open, league, fixtures]);

  const isSetsLeague = league?.is_sets;

  const handleSave = async (fixture) => {
    const s = scores[fixture.id];
    if (!s || s.home === '' || s.away === '') return;
    await base44.entities.LeagueFixture.update(fixture.id, {
      home_score: parseInt(s.home),
      away_score: parseInt(s.away),
      ...(isSetsLeague ? { home_sets: s.home_sets !== '' ? parseInt(s.home_sets) : null, away_sets: s.away_sets !== '' ? parseInt(s.away_sets) : null } : {}),
      status: 'completed',
      // Clear any pending/conflict data when admin saves directly
      pending_home_score: null,
      pending_away_score: null,
      pending_home_sets: null,
      pending_away_sets: null,
      pending_submitted_by_email: null,
      pending_submitted_by_team_id: null,
      conflict_first_home_score: null,
      conflict_first_away_score: null,
      conflict_first_home_sets: null,
      conflict_first_away_sets: null,
      conflict_first_team_id: null,
      conflict_second_home_score: null,
      conflict_second_away_score: null,
      conflict_second_home_sets: null,
      conflict_second_away_sets: null,
      conflict_second_team_id: null,
    });
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['allLeagueFixtures', clubId] });
    toast.success('Score saved');
  };

  const handleClear = async (fixture) => {
    await base44.entities.LeagueFixture.update(fixture.id, {
      home_score: null,
      away_score: null,
      home_sets: null,
      away_sets: null,
      status: 'scheduled',
      pending_home_score: null,
      pending_away_score: null,
      pending_home_sets: null,
      pending_away_sets: null,
      pending_submitted_by_email: null,
      pending_submitted_by_team_id: null,
      conflict_first_home_score: null,
      conflict_first_away_score: null,
      conflict_first_home_sets: null,
      conflict_first_away_sets: null,
      conflict_first_team_id: null,
      conflict_second_home_score: null,
      conflict_second_away_score: null,
      conflict_second_home_sets: null,
      conflict_second_away_sets: null,
      conflict_second_team_id: null,
    });
    setScores(prev => ({
      ...prev,
      [fixture.id]: { home: '', away: '', home_sets: '', away_sets: '' },
    }));
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['allLeagueFixtures', clubId] });
    toast.success('Result cleared');
  };

  const leagueFixtures = fixtures
    .filter(f => f.league_id === league?.id)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  // Fixtures with a pending (one team submitted, awaiting other)
  const pendingFixtures = leagueFixtures.filter(f => f.pending_submitted_by_email != null && f.status !== 'completed');
  // Fixtures with a confirmed conflict (both teams submitted, scores differ)
  const conflictFixtures = leagueFixtures.filter(f => f.conflict_first_home_score != null && f.status !== 'completed');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{league?.name} — Scores</DialogTitle>
        </DialogHeader>

        {/* Conflict banner — mismatched scores from both teams */}
        {conflictFixtures.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">Score conflict{conflictFixtures.length > 1 ? 's' : ''} — admin action required</p>
              <p className="text-xs mt-0.5">
                {conflictFixtures.length} fixture{conflictFixtures.length > 1 ? 's have' : ' has'} mismatched scores submitted by both teams. Review the conflicting entries below and enter the correct score manually.
              </p>
            </div>
          </div>
        )}

        {/* Pending banner — one team submitted, waiting for other */}
        {pendingFixtures.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold">Pending result{pendingFixtures.length > 1 ? 's' : ''} awaiting confirmation</p>
              <p className="text-xs mt-0.5">
                {pendingFixtures.length} fixture{pendingFixtures.length > 1 ? 's have' : ' has'} a score submitted by one team but not yet confirmed by the other.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-medium text-gray-600 w-28">Date</th>
                <th className="p-3 text-center font-medium text-gray-600">Rink</th>
                <th className="p-3 text-right font-medium text-gray-600">Home Team</th>
                {isSetsLeague && <th className="p-3 text-center font-medium text-gray-600 w-20">H Sets</th>}
                {isSetsLeague && <th className="p-3 text-center font-medium text-gray-600 w-20">A Sets</th>}
                <th className="p-3 text-center font-medium text-gray-600 w-20">Home</th>
                <th className="p-3 text-center font-medium text-gray-600 w-20">Away</th>
                <th className="p-3 text-left font-medium text-gray-600">Away Team</th>
                <th className="p-3 text-center font-medium text-gray-600 w-24">Result</th>
                <th className="p-3 text-center font-medium text-gray-600">Winner</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {leagueFixtures.map(fixture => {
                const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                const s = scores[fixture.id] || { home: '', away: '', home_sets: '', away_sets: '' };
                const hScore = s.home !== '' ? parseInt(s.home) : null;
                const aScore = s.away !== '' ? parseInt(s.away) : null;
                const hasResult = hScore !== null && aScore !== null;
                const result = hasResult ? `${hScore} – ${aScore}` : '—';
                const winner = hasResult
                  ? (hScore > aScore ? homeTeam?.name : hScore < aScore ? awayTeam?.name : 'Draw')
                  : '—';

                const hasPending = fixture.pending_submitted_by_email != null && fixture.status !== 'completed';
                const hasConflict = fixture.conflict_first_home_score != null && fixture.status !== 'completed';

                const firstTeam = hasConflict ? teams.find(t => t.id === fixture.conflict_first_team_id) : null;
                const secondTeam = hasConflict ? teams.find(t => t.id === fixture.conflict_second_team_id) : null;

                return (
                  <React.Fragment key={fixture.id}>
                    <tr className={`border-b hover:bg-gray-50 ${fixture.status === 'completed' ? 'bg-emerald-50/30' : ''} ${hasPending ? 'bg-amber-50/40' : ''} ${hasConflict ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                        {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">R{fixture.rink_number}</Badge>
                      </td>
                      <td className="p-3 text-right font-medium text-gray-800">{homeTeam?.name || '—'}</td>
                      {isSetsLeague && (
                        <td className="p-3">
                          <Input
                            type="number" min="0"
                            value={s.home_sets}
                            onChange={(e) => setScores(prev => ({ ...prev, [fixture.id]: { ...s, home_sets: e.target.value } }))}
                            className="w-16 text-center h-8 text-sm"
                            placeholder="0"
                          />
                        </td>
                      )}
                      {isSetsLeague && (
                        <td className="p-3">
                          <Input
                            type="number" min="0"
                            value={s.away_sets}
                            onChange={(e) => setScores(prev => ({ ...prev, [fixture.id]: { ...s, away_sets: e.target.value } }))}
                            className="w-16 text-center h-8 text-sm"
                            placeholder="0"
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <Input
                          type="number" min="0"
                          value={s.home}
                          onChange={(e) => setScores(prev => ({ ...prev, [fixture.id]: { ...s, home: e.target.value } }))}
                          className="w-16 text-center h-8 text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number" min="0"
                          value={s.away}
                          onChange={(e) => setScores(prev => ({ ...prev, [fixture.id]: { ...s, away: e.target.value } }))}
                          className="w-16 text-center h-8 text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-800">{awayTeam?.name || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`font-mono text-sm font-semibold ${hasResult ? 'text-gray-800' : 'text-gray-400'}`}>{result}</span>
                      </td>
                      <td className="p-3 text-center">
                        {hasResult ? (
                          <Badge className={winner === 'Draw' ? 'bg-gray-100 text-gray-700 border' : 'bg-emerald-100 text-emerald-800'}>
                            {winner}
                          </Badge>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                            disabled={s.home === '' || s.away === ''}
                            onClick={() => handleSave(fixture)}
                            title="Save score"
                          >
                            ✓
                          </Button>
                          {(fixture.status === 'completed' || hasPending || hasConflict) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => handleClear(fixture)}
                              title="Clear result"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Pending score row */}
                    {hasPending && (
                      <tr className="border-b bg-amber-50">
                        <td colSpan={isSetsLeague ? 11 : 9} className="px-3 py-1.5">
                          <div className="flex items-center gap-2 text-xs text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Pending score submitted by one team:{' '}
                              <strong>
                                {homeTeam?.name} {fixture.pending_home_score} – {fixture.pending_away_score} {awayTeam?.name}
                                {fixture.pending_home_sets != null ? ` (Sets: ${fixture.pending_home_sets}–${fixture.pending_away_sets})` : ''}
                              </strong>
                              {' '}— awaiting confirmation from the opposing team.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Conflict row — both teams submitted but scores differ */}
                    {hasConflict && (
                      <tr className="border-b bg-red-50">
                        <td colSpan={isSetsLeague ? 11 : 9} className="px-3 py-2">
                          <div className="flex items-start gap-2 text-xs text-red-800">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                            <div className="space-y-1">
                              <p className="font-semibold">Score conflict — both teams submitted different results:</p>
                              <div className="flex flex-wrap gap-3">
                                <span className="bg-red-100 border border-red-300 rounded px-2 py-0.5 font-mono font-bold">
                                  {firstTeam?.name || 'Team 1'}: {homeTeam?.name} {fixture.conflict_first_home_score} – {fixture.conflict_first_away_score} {awayTeam?.name}
                                  {fixture.conflict_first_home_sets != null ? ` (Sets: ${fixture.conflict_first_home_sets}–${fixture.conflict_first_away_sets})` : ''}
                                </span>
                                <span className="bg-red-100 border border-red-300 rounded px-2 py-0.5 font-mono font-bold">
                                  {secondTeam?.name || 'Team 2'}: {homeTeam?.name} {fixture.conflict_second_home_score} – {fixture.conflict_second_away_score} {awayTeam?.name}
                                  {fixture.conflict_second_home_sets != null ? ` (Sets: ${fixture.conflict_second_home_sets}–${fixture.conflict_second_away_sets})` : ''}
                                </span>
                              </div>
                              <p className="text-red-600">Enter the correct score above and click ✓ to resolve, or use the ✕ button to clear.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {leagueFixtures.length === 0 && (
                <tr>
                  <td colSpan={isSetsLeague ? 11 : 9} className="p-8 text-center text-gray-400">No fixtures generated yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}