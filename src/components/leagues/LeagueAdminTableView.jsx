import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Users, Pencil, Trash2, Plus, Zap, CalendarCheck, List,
  BarChart3, Printer, CalendarX, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function LeagueAdminTableView({
  leagues, teams, fixtures, club, members,
  onEditLeague, onDeleteLeague, onAddTeam, onEditTeam, onDeleteTeam,
  onGenerateFixtures, onBookRinks, onViewFixtures, onViewTable, onBlacklist,
  generatingFixtures, bookingRinks, onGenerateScorecards,
}) {
  const [expandedLeague, setExpandedLeague] = useState(null);
  const toggle = (id) => setExpandedLeague(prev => prev === id ? null : id);

  return (
    <div className="space-y-3">
      {leagues.map((league) => {
        const leagueTeams = teams.filter(t => t.league_id === league.id);
        const leagueFixtures = fixtures.filter(f => f.league_id === league.id);
        const isExpanded = expandedLeague === league.id;

        return (
          <div key={league.id} className="border rounded-xl bg-white overflow-hidden">
            {/* Header Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:text-emerald-700 transition-colors"
                onClick={() => toggle(league.id)}
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{league.name}</span>
                    <Badge className={`text-xs ${statusColors[league.status || 'draft']}`}>
                      {league.status || 'draft'}
                    </Badge>
                    {league.format && (
                      <Badge variant="outline" className="text-xs">
                        {league.format === 'triples' ? 'Triples' : 'Fours'}
                      </Badge>
                    )}
                    {league.is_sets && (
                      <Badge variant="outline" className="text-xs text-purple-700 border-purple-300 bg-purple-50">
                        Sets ({league.sets_ends} ends)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {league.start_date && league.end_date && (
                      <span>{format(parseISO(league.start_date), 'd MMM')} – {format(parseISO(league.end_date), 'd MMM yy')}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{leagueTeams.length} teams
                    </span>
                    {league.fixtures_generated && (
                      <span className="text-emerald-600">{leagueFixtures.length} fixtures</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {!league.fixtures_generated && leagueTeams.length >= 2 && league.start_date && league.end_date && (
                  <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                    onClick={() => onGenerateFixtures(league)} disabled={generatingFixtures}>
                    {generatingFixtures ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    <span className="hidden sm:inline ml-1">Fixtures</span>
                  </Button>
                )}
                {league.fixtures_generated && !league.bookings_created && (
                  <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                    onClick={() => onBookRinks(league)} disabled={bookingRinks}>
                    {bookingRinks ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarCheck className="w-3 h-3" />}
                    <span className="hidden sm:inline ml-1">Book</span>
                  </Button>
                )}
                {league.fixtures_generated && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onViewFixtures(league)} title="View Fixtures">
                      <List className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onViewTable(league)} title="League Table">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onGenerateScorecards(league)} title="Scorecards">
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onBlacklist(league)} title="Blacklist Dates">
                  <CalendarX className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEditLeague(league)} title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteLeague(league.id)} title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Expanded: Teams */}
            {isExpanded && (
              <div className="border-t bg-gray-50">
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Teams ({leagueTeams.length})
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAddTeam(league)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Team
                  </Button>
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
                        <th className="px-5 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leagueTeams.map((team) => (
                        <tr key={team.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-2.5 font-medium text-gray-900">{team.name}</td>
                          <td className="px-5 py-2.5 text-gray-600 hidden sm:table-cell">
                            {team.captain_name || team.captain_email || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500">{team.players?.length ?? 0}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditTeam(team)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDeleteTeam(team.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
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
    </div>
  );
}