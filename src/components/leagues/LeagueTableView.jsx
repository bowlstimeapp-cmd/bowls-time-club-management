import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Calendar, Clock, Users, ChevronDown, ChevronRight, List, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateLeagueTable, getScoringRules } from '@/lib/leagueScoring';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function LeagueTableView({ leagues, teams, fixtures }) {
  const [expandedLeague, setExpandedLeague] = useState(null);
  const [fixturesDialogOpen, setFixturesDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [viewingLeague, setViewingLeague] = useState(null);
  const [viewingTableLeague, setViewingTableLeague] = useState(null);

  const toggleLeague = (id) => setExpandedLeague(prev => prev === id ? null : id);

  return (
    <div className="space-y-3">
      {leagues.map((league) => {
        const leagueTeams = teams.filter(t => t.league_id === league.id);
        const leagueFixtures = fixtures.filter(f => f.league_id === league.id);
        const isExpanded = expandedLeague === league.id;

        return (
          <div key={league.id} className="border rounded-xl bg-white overflow-hidden">
            {/* League Header Row */}
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => toggleLeague(league.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{league.name}</span>
                  <Badge className={statusColors[league.status || 'draft']}>
                    {league.status || 'draft'}
                  </Badge>
                  {league.format && (
                    <Badge variant="outline" className="text-xs">
                      {league.format === 'triples' ? 'Triples' : 'Fours'}
                    </Badge>
                  )}
                </div>
                {league.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{league.description}</p>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 shrink-0">
                {league.start_date && league.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(parseISO(league.start_date), 'd MMM')} – {format(parseISO(league.end_date), 'd MMM yy')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {leagueTeams.length} teams
                </span>
                {league.fixtures_generated && (
                  <span className="text-emerald-600 font-medium">{leagueFixtures.length} fixtures</span>
                )}
              </div>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
            </button>

            {/* Expanded: Teams table */}
            {isExpanded && (
              <div className="border-t bg-gray-50">
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Teams</span>
                  {league.fixtures_generated && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingLeague(league);
                          setFixturesDialogOpen(true);
                        }}
                      >
                        <List className="w-3.5 h-3.5 mr-1" />
                        Fixtures
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTableLeague(league);
                          setTableDialogOpen(true);
                        }}
                      >
                        <BarChart3 className="w-3.5 h-3.5 mr-1" />
                        Table
                      </Button>
                    </div>
                  )}
                </div>
                {leagueTeams.length === 0 ? (
                  <p className="px-5 pb-4 text-sm text-gray-400">No teams yet</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-gray-200 bg-white">
                        <th className="text-left px-5 py-2 font-semibold text-gray-600">Team</th>
                        <th className="text-left px-5 py-2 font-semibold text-gray-600 hidden sm:table-cell">Captain</th>
                        <th className="text-left px-5 py-2 font-semibold text-gray-600">Players</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leagueTeams.map((team) => (
                        <tr key={team.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-2.5 font-medium text-gray-900">{team.name}</td>
                          <td className="px-5 py-2.5 text-gray-600 hidden sm:table-cell">
                            {team.captain_name || team.captain_email || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500">
                            {team.players?.length ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* League Table Dialog */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{viewingTableLeague?.name} — League Table</DialogTitle>
          </DialogHeader>
          {viewingTableLeague && (() => {
            const leagueTeams = teams.filter(t => t.league_id === viewingTableLeague.id);
            const leagueFixtures = fixtures.filter(f => f.league_id === viewingTableLeague.id);
            const table = calculateLeagueTable(viewingTableLeague, leagueTeams, leagueFixtures);
            const scoringRules = getScoringRules(viewingTableLeague);
            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-gray-50">Pos</th>
                        <th className="border p-2 bg-gray-50 text-left">Team</th>
                        <th className="border p-2 bg-gray-50">P</th>
                        <th className="border p-2 bg-gray-50">W</th>
                        <th className="border p-2 bg-gray-50">D</th>
                        <th className="border p-2 bg-gray-50">L</th>
                        <th className="border p-2 bg-gray-50">PF</th>
                        <th className="border p-2 bg-gray-50">PA</th>
                        <th className="border p-2 bg-gray-50">+/-</th>
                        <th className="border p-2 bg-gray-50">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((entry, idx) => (
                        <tr key={entry.team.id}>
                          <td className="border p-2 text-center font-medium">{idx + 1}</td>
                          <td className="border p-2 font-medium">{entry.team.name}</td>
                          <td className="border p-2 text-center">{entry.played}</td>
                          <td className="border p-2 text-center">{entry.won}</td>
                          <td className="border p-2 text-center">{entry.drawn}</td>
                          <td className="border p-2 text-center">{entry.lost}</td>
                          <td className="border p-2 text-center">{entry.pointsFor}</td>
                          <td className="border p-2 text-center">{entry.pointsAgainst}</td>
                          <td className="border p-2 text-center">{entry.pointsDiff > 0 ? '+' : ''}{entry.pointsDiff}</td>
                          <td className="border p-2 text-center font-bold">{entry.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {scoringRules.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
                    <p className="font-semibold text-gray-700 mb-1">League Scoring Rules:</p>
                    <ul className="space-y-0.5">
                      {scoringRules.map((rule, i) => (
                        <li key={i}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Fixtures Dialog */}
      <Dialog open={fixturesDialogOpen} onOpenChange={setFixturesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{viewingLeague?.name} — Fixtures</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Home</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Away</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Rink</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {viewingLeague && fixtures
                  .filter(f => f.league_id === viewingLeague.id)
                  .sort((a, b) => a.match_date.localeCompare(b.match_date))
                  .map(fixture => {
                    const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                    const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                    return (
                      <tr key={fixture.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{homeTeam?.name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-700">{awayTeam?.name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">
                          {fixture.rink_number ? `Rink ${fixture.rink_number}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {fixture.status === 'completed' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                              {fixture.home_score} – {fixture.away_score}
                            </Badge>
                          ) : <span className="text-gray-400">Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {viewingLeague && fixtures.filter(f => f.league_id === viewingLeague.id).length === 0 && (
              <p className="text-center text-gray-500 py-6 text-sm">No fixtures generated yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}