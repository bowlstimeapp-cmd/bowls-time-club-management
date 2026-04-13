import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';

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
      };
    });
    setScores(init);
  }, [open, league, fixtures]);

  const handleSave = async (fixture) => {
    const s = scores[fixture.id];
    if (!s || s.home === '' || s.away === '') return;
    await base44.entities.LeagueFixture.update(fixture.id, {
      home_score: parseInt(s.home),
      away_score: parseInt(s.away),
      status: 'completed',
    });
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    toast.success('Score saved');
  };

  const leagueFixtures = fixtures
    .filter(f => f.league_id === league?.id)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{league?.name} — Scores</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-medium text-gray-600 w-28">Date</th>
                <th className="p-3 text-center font-medium text-gray-600">Rink</th>
                <th className="p-3 text-right font-medium text-gray-600">Home Team</th>
                <th className="p-3 text-center font-medium text-gray-600 w-20">Home</th>
                <th className="p-3 text-center font-medium text-gray-600 w-20">Away</th>
                <th className="p-3 text-left font-medium text-gray-600">Away Team</th>
                <th className="p-3 text-center font-medium text-gray-600 w-24">Result</th>
                <th className="p-3 text-center font-medium text-gray-600">Winner</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {leagueFixtures.map(fixture => {
                const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                const s = scores[fixture.id] || { home: '', away: '' };
                const hScore = s.home !== '' ? parseInt(s.home) : null;
                const aScore = s.away !== '' ? parseInt(s.away) : null;
                const hasResult = hScore !== null && aScore !== null;
                const result = hasResult ? `${hScore} – ${aScore}` : '—';
                const winner = hasResult
                  ? (hScore > aScore ? homeTeam?.name : hScore < aScore ? awayTeam?.name : 'Draw')
                  : '—';

                return (
                  <tr key={fixture.id} className={`border-b hover:bg-gray-50 ${fixture.status === 'completed' ? 'bg-emerald-50/30' : ''}`}>
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">R{fixture.rink_number}</Badge>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-800">{homeTeam?.name || '—'}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
                        value={s.home}
                        onChange={(e) => setScores(prev => ({ ...prev, [fixture.id]: { ...s, home: e.target.value } }))}
                        className="w-16 text-center h-8 text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
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
                    </td>
                  </tr>
                );
              })}
              {leagueFixtures.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">No fixtures generated yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}