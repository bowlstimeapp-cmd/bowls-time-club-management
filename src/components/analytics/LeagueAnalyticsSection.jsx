import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, ListChecks, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function LeagueStat({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${accent}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function LeagueAnalyticsSection({ clubId }) {
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['analyticsLeagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['analyticsLeagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: fixtures = [] } = useQuery({
    queryKey: ['analyticsLeagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['analyticsClubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    if (member?.first_name && member?.surname) return `${member.first_name} ${member.surname}`;
    return member?.user_name || email;
  };

  const activeLeagues = leagues.filter(l => l.status === 'active');
  const totalLeagues = leagues.filter(l => l.status === 'active' || l.status === 'completed');
  const activeLeagueIds = new Set(activeLeagues.map(l => l.id));
  const teamsInActiveLeagues = teams.filter(t => activeLeagueIds.has(t.league_id));
  const teamsWithRota = teamsInActiveLeagues.filter(
    t => t.fixture_rota && Object.keys(t.fixture_rota).length > 0
  );

  // Teams (active leagues) with players selected on a day they're marked unavailable
  const teamsWithConflicts = useMemo(() => {
    return teamsInActiveLeagues
      .map(team => {
        const rota = team.fixture_rota;
        if (!rota || Object.keys(rota).length === 0 || !team.player_unavailability) return null;
        const teamFixturesList = fixtures
          .filter(f => f.home_team_id === team.id || f.away_team_id === team.id)
          .sort((a, b) => a.match_date.localeCompare(b.match_date));
        const conflicts = [];
        teamFixturesList.forEach(f => {
          const opponent = teams.find(t => t.id === (f.home_team_id === team.id ? f.away_team_id : f.home_team_id))?.name;
          (rota[f.id] || []).forEach(playerEmail => {
            const unavailable = team.player_unavailability[playerEmail] || [];
            if (unavailable.includes(f.match_date)) {
              conflicts.push({ playerEmail, date: f.match_date, opponent });
            }
          });
        });
        return conflicts.length > 0 ? { team, conflicts } : null;
      })
      .filter(Boolean);
  }, [teamsInActiveLeagues, fixtures, teams]);

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
  const leagueTeams = teams.filter(t => t.league_id === selectedLeagueId);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const teamFixtures = useMemo(() => {
    if (!selectedTeam) return [];
    return fixtures
      .filter(f => f.home_team_id === selectedTeam.id || f.away_team_id === selectedTeam.id)
      .sort((a, b) => a.match_date.localeCompare(b.match_date));
  }, [fixtures, selectedTeam]);

  const rota = selectedTeam?.fixture_rota || {};
  const hasRota = selectedTeam && Object.keys(rota).length > 0;
  const players = selectedTeam?.players || [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-purple-600" />
          Leagues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {leaguesLoading || teamsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LeagueStat icon={Trophy} label="Leagues (active + archived)" value={totalLeagues.length} accent="bg-purple-100 text-purple-600" sub={`${activeLeagues.length} active · ${totalLeagues.length - activeLeagues.length} archived`} />
            <LeagueStat icon={Trophy} label="Active Leagues" value={activeLeagues.length} accent="bg-emerald-100 text-emerald-600" />
            <LeagueStat icon={Users} label="Teams (active leagues)" value={teamsInActiveLeagues.length} accent="bg-blue-100 text-blue-600" />
            <LeagueStat icon={ListChecks} label="Teams with a Generated Rota" value={teamsWithRota.length} accent="bg-amber-100 text-amber-600" />
          </div>
        )}

        {/* Rota conflict warnings */}
        <div className="border-t pt-5">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Rota Conflict Warnings — teams with players selected on a day they are unavailable
          </p>
          {teamsWithConflicts.length === 0 ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> No rota conflicts in active leagues.
            </p>
          ) : (
            <div className="space-y-2">
              {teamsWithConflicts.map(({ team, conflicts }) => (
                <div key={team.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-semibold text-gray-900">{team.name}</span>
                    <span className="text-xs text-gray-500">({leagues.find(l => l.id === team.league_id)?.name || 'Unknown league'})</span>
                    <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {conflicts.map((c, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-6">
                        {getMemberName(c.playerEmail)} is unavailable on {format(parseISO(c.date), 'EEE d MMM yyyy')} but is selected to play{c.opponent ? ` vs ${c.opponent}` : ''}.
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rota viewer */}
        <div className="border-t pt-5">
          <p className="text-xs font-medium text-gray-500 mb-2">Team Rota Viewer</p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select
              value={selectedLeagueId}
              onValueChange={(v) => { setSelectedLeagueId(v); setSelectedTeamId(''); }}
            >
              <SelectTrigger className="w-full sm:w-64 text-sm"><SelectValue placeholder="Select a league" /></SelectTrigger>
              <SelectContent>
                {leagues.map(league => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name} {league.status === 'completed' ? '(archived)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              disabled={!selectedLeagueId || leagueTeams.length === 0}
            >
              <SelectTrigger className="w-full sm:w-64 text-sm"><SelectValue placeholder="Select a team" /></SelectTrigger>
              <SelectContent>
                {leagueTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTeamId && !selectedTeam && (
            <p className="text-sm text-gray-400 py-4">Select a team to view its rota.</p>
          )}

          {selectedTeam && !hasRota && (
            <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed">
              <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No rota generated</p>
            </div>
          )}

          {selectedTeam && hasRota && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-50 text-left whitespace-nowrap">Fixture</th>
                    <th className="border p-2 bg-gray-50 text-left whitespace-nowrap">Date</th>
                    <th className="border p-2 bg-gray-50">Rink</th>
                    {players.map(player => (
                      <th key={player} className="border p-2 bg-gray-50 text-center whitespace-nowrap">
                        {getMemberName(player).split(' ').map(n => n[0]).join('')}
                        <div className="text-xs font-normal text-gray-500">{getMemberName(player)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamFixtures.map((fixture, rowIdx) => {
                    const isHome = fixture.home_team_id === selectedTeam.id;
                    const opponentName = isHome
                      ? teams.find(t => t.id === fixture.away_team_id)?.name
                      : teams.find(t => t.id === fixture.home_team_id)?.name;
                    const rotaPlayers = rota[fixture.id] || [];
                    return (
                      <tr key={fixture.id} className={rowIdx % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border p-2 whitespace-nowrap">vs {opponentName || '—'}</td>
                        <td className="border p-2 whitespace-nowrap">
                          {fixture.match_date ? format(parseISO(fixture.match_date), 'd MMM yyyy') : '—'}
                        </td>
                        <td className="border p-2 text-center">{fixture.rink_number ?? '—'}</td>
                        {players.map(player => (
                          <td key={player} className="border p-2 text-center">
                            {rotaPlayers.includes(player) && (
                              <span className="text-emerald-600 font-bold">X</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="font-medium bg-gray-50">
                    <td className="border p-2" colSpan={3}>Total Games</td>
                    {players.map(player => (
                      <td key={player} className="border p-2 text-center">
                        {teamFixtures.filter(f => (rota[f.id] || []).includes(player)).length}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}