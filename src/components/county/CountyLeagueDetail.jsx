import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Trophy, CalendarDays, Users, ChevronLeft } from 'lucide-react';
import { calculateLeagueTable } from '@/lib/leagueScoring';
import CountyFixtureScoreModal from './CountyFixtureScoreModal';

export default function CountyLeagueDetail({ countyId, league, teams, canAdmin, onBack }) {
  const qc = useQueryClient();
  const [scoreModal, setScoreModal] = useState(null);
  const [fixtureDialog, setFixtureDialog] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({ homeTeamId: '', awayTeamId: '', matchDate: '', venue: '' });

  const leagueTeamIds = league.team_ids || [];
  const leagueTeams = teams.filter(function (t) { return leagueTeamIds.includes(t.id); });
  const availableTeams = teams.filter(function (t) { return !leagueTeamIds.includes(t.id); });

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ['countyLeagueFixtures', league.id],
    queryFn: function () { return base44.entities.CountyLeagueFixture.filter({ league_id: league.id }); },
    enabled: !!league.id,
  });
  const fixtureList = fixtures || [];

  const standings = calculateLeagueTable(league, leagueTeams, fixtureList);

  const refresh = function () { qc.invalidateQueries({ queryKey: ['countyLeagueFixtures', league.id] }); };
  const refreshLeague = function () { qc.invalidateQueries({ queryKey: ['countyLeagues', countyId] }); };

  const createFixture = useMutation({
    mutationFn: function (data) { return base44.functions.invoke('createCountyFixture', data); },
    onSuccess: function () { refresh(); toast.success('Fixture created'); setFixtureDialog(false); setFixtureForm({ homeTeamId: '', awayTeamId: '', matchDate: '', venue: '' }); },
    onError: function (e) { toast.error(e.message || 'Failed'); },
  });
  const deleteFixture = useMutation({
    mutationFn: function (fixtureId) { return base44.functions.invoke('deleteCountyFixture', { countyId: countyId, fixtureId: fixtureId }); },
    onSuccess: function () { refresh(); toast.success('Fixture deleted'); },
    onError: function (e) { toast.error(e.message || 'Failed'); },
  });

  function toggleTeam(teamId, add) {
    var newIds = add ? leagueTeamIds.concat([teamId]) : leagueTeamIds.filter(function (id) { return id !== teamId; });
    base44.functions.invoke('updateCountyLeagueData', { entity: 'CountyLeague', action: 'update', countyId: countyId, id: league.id, data: { team_ids: newIds } })
      .then(function () { refreshLeague(); toast.success(add ? 'Team added' : 'Team removed'); })
      .catch(function (e) { toast.error(e.message || 'Failed'); });
  }

  function submitFixture() {
    if (!fixtureForm.homeTeamId || !fixtureForm.awayTeamId || !fixtureForm.matchDate) { toast.error('Fill all fields'); return; }
    if (fixtureForm.homeTeamId === fixtureForm.awayTeamId) { toast.error('Home and away must differ'); return; }
    createFixture.mutate({ countyId: countyId, leagueId: league.id, homeTeamId: fixtureForm.homeTeamId, awayTeamId: fixtureForm.awayTeamId, matchDate: fixtureForm.matchDate, venue: fixtureForm.venue });
  }

  function teamName(id) {
    var t = teams.find(function (x) { return x.id === id; });
    return t ? t.name : 'Unknown';
  }
  function teamById(id) {
    return teams.find(function (x) { return x.id === id; });
  }
  function statusBadge(f) {
    if (f.status === 'completed') return 'Done';
    if (f.conflict_first_home_score != null) return 'Conflict';
    if (f.pending_submitted_by_email != null) return 'Pending';
    return 'Scheduled';
  }
  function statusClass(f) {
    if (f.status === 'completed') return 'bg-green-100 text-green-700';
    if (f.conflict_first_home_score != null) return 'bg-red-100 text-red-700';
    if (f.pending_submitted_by_email != null) return 'bg-amber-100 text-amber-700';
    return '';
  }

  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', { className: 'flex items-center gap-3' },
      React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: onBack }, React.createElement(ChevronLeft, { className: 'w-4 h-4' }), 'Leagues'),
      React.createElement('h3', { className: 'text-lg font-bold flex-1' }, league.name),
      React.createElement(Badge, { variant: 'outline' }, league.status),
      league.is_sets ? React.createElement(Badge, { className: 'bg-purple-100 text-purple-700' }, 'Sets') : null
    ),
    React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: 'flex items-center gap-2 text-sm' }, React.createElement(Users, { className: 'w-4 h-4' }), 'Teams (', leagueTeams.length, ')')),
      React.createElement(CardContent, { className: 'space-y-2' },
        leagueTeams.length === 0 ? React.createElement('p', { className: 'text-sm text-slate-400' }, 'No teams yet.') : null,
        leagueTeams.map(function (t) {
          return React.createElement('div', { key: t.id, className: 'flex items-center justify-between border rounded-lg p-2 bg-white' },
            React.createElement('div', null, React.createElement('span', { className: 'font-medium text-sm' }, t.name), t.team_type === 'club' ? React.createElement(Badge, { variant: 'outline', className: 'ml-2 text-xs' }, 'Club') : null),
            canAdmin ? React.createElement(Button, { size: 'sm', variant: 'ghost', className: 'text-red-500', onClick: function () { toggleTeam(t.id, false); } }, React.createElement(Trash2, { className: 'w-3.5 h-3.5' })) : null
          );
        }),
        canAdmin && availableTeams.length > 0 ? React.createElement(Select, { onValueChange: function (v) { toggleTeam(v, true); } },
          React.createElement(SelectTrigger, { className: 'mt-2' }, React.createElement(SelectValue, { placeholder: 'Add team to league...' })),
          React.createElement(SelectContent, null, availableTeams.map(function (t) { return React.createElement(SelectItem, { key: t.id, value: t.id }, t.name); }))
        ) : null
      )
    ),
    leagueTeams.length > 0 ? React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: 'flex items-center gap-2 text-sm' }, React.createElement(Trophy, { className: 'w-4 h-4' }), 'Standings')),
      React.createElement(CardContent, null,
        React.createElement('table', { className: 'w-full text-sm' },
          React.createElement('thead', null, React.createElement('tr', { className: 'text-left text-xs text-slate-400 border-b' },
            React.createElement('th', { className: 'py-1' }, '#'), React.createElement('th', { className: 'py-1' }, 'Team'), React.createElement('th', { className: 'text-center py-1' }, 'P'), React.createElement('th', { className: 'text-center py-1 font-bold' }, 'Pts')
          )),
          React.createElement('tbody', null, standings.map(function (s, i) {
            return React.createElement('tr', { key: s.team.id, className: 'border-b last:border-0' },
              React.createElement('td', { className: 'py-1.5 text-slate-400' }, String(i + 1)),
              React.createElement('td', { className: 'py-1.5 font-medium' }, s.team.name),
              React.createElement('td', { className: 'text-center py-1.5' }, String(s.played)),
              React.createElement('td', { className: 'text-center py-1.5 font-bold' }, String(s.points))
            );
          }))
        )
      )
    ) : null,
    React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement(CardTitle, { className: 'flex items-center gap-2 text-sm' }, React.createElement(CalendarDays, { className: 'w-4 h-4' }), 'Fixtures (', fixtureList.length, ')'),
        canAdmin ? React.createElement(Button, { size: 'sm', onClick: function () { setFixtureDialog(true); } }, React.createElement(Plus, { className: 'w-3.5 h-3.5 mr-1' }), 'Add') : null
      )),
      React.createElement(CardContent, { className: 'space-y-2' },
        isLoading ? React.createElement('p', { className: 'text-sm text-slate-400' }, 'Loading...') :
        fixtureList.length === 0 ? React.createElement('p', { className: 'text-sm text-slate-400' }, 'No fixtures yet.') :
        fixtureList.map(function (f) {
          return React.createElement('div', { key: f.id, className: 'border rounded-lg p-3 bg-white' },
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('div', { className: 'flex-1' },
                React.createElement('div', { className: 'flex items-center gap-2 text-sm' },
                  React.createElement('span', { className: 'text-slate-400' }, format(parseISO(f.match_date), 'd MMM')),
                  f.venue ? React.createElement('span', { className: 'text-xs text-slate-400' }, '· ' + f.venue) : null
                ),
                React.createElement('div', { className: 'flex items-center gap-2 mt-1' },
                  React.createElement('span', { className: 'font-medium text-sm' }, teamName(f.home_team_id)),
                  f.status === 'completed' ? React.createElement('span', { className: 'font-bold text-sm' }, f.home_score + '–' + f.away_score) : React.createElement('span', { className: 'text-slate-400 text-sm' }, 'vs'),
                  React.createElement('span', { className: 'font-medium text-sm' }, teamName(f.away_team_id))
                )
              ),
              React.createElement('div', { className: 'flex items-center gap-2' },
                statusBadge(f) === 'Done' ? React.createElement(Badge, { className: 'bg-green-100 text-green-700' }, 'Done') :
                statusBadge(f) === 'Conflict' ? React.createElement(Badge, { className: 'bg-red-100 text-red-700' }, 'Conflict') :
                statusBadge(f) === 'Pending' ? React.createElement(Badge, { className: 'bg-amber-100 text-amber-700' }, 'Pending') :
                React.createElement(Badge, { variant: 'outline' }, 'Scheduled'),
                React.createElement(Button, { size: 'sm', variant: 'outline', onClick: function () { setScoreModal(f); } }, 'Score'),
                canAdmin ? React.createElement(Button, { size: 'sm', variant: 'ghost', className: 'text-red-500', onClick: function () { deleteFixture.mutate(f.id); } }, React.createElement(Trash2, { className: 'w-3.5 h-3.5' })) : null
              )
            )
          );
        })
      )
    ),
    scoreModal ? React.createElement(CountyFixtureScoreModal, { countyId: countyId, fixture: scoreModal, league: league, teams: teams, canAdmin: canAdmin, onClose: function () { setScoreModal(null); } }) : null,
    React.createElement(Dialog, { open: fixtureDialog, onOpenChange: setFixtureDialog },
      React.createElement(DialogContent, null,
        React.createElement(DialogHeader, null, React.createElement(DialogTitle, null, 'Add Fixture')),
        React.createElement('div', { className: 'space-y-3 py-2' },
          React.createElement('div', null, React.createElement('label', { className: 'text-sm font-medium' }, 'Date'), React.createElement(Input, { type: 'date', value: fixtureForm.matchDate, onChange: function (e) { setFixtureForm(function (f) { return Object.assign({}, f, { matchDate: e.target.value }); }); }, className: 'mt-1' })),
          React.createElement('div', null, React.createElement('label', { className: 'text-sm font-medium' }, 'Home Team'),
            React.createElement(Select, { value: fixtureForm.homeTeamId, onValueChange: function (v) { setFixtureForm(function (f) { return Object.assign({}, f, { homeTeamId: v }); }); } },
              React.createElement(SelectTrigger, { className: 'mt-1' }, React.createElement(SelectValue, { placeholder: 'Select...' })),
              React.createElement(SelectContent, null, leagueTeams.map(function (t) { return React.createElement(SelectItem, { key: t.id, value: t.id }, t.name); }))
            )
          ),
          React.createElement('div', null, React.createElement('label', { className: 'text-sm font-medium' }, 'Away Team'),
            React.createElement(Select, { value: fixtureForm.awayTeamId, onValueChange: function (v) { setFixtureForm(function (f) { return Object.assign({}, f, { awayTeamId: v }); }); } },
              React.createElement(SelectTrigger, { className: 'mt-1' }, React.createElement(SelectValue, { placeholder: 'Select...' })),
              React.createElement(SelectContent, null, leagueTeams.map(function (t) { return React.createElement(SelectItem, { key: t.id, value: t.id }, t.name); }))
            )
          ),
          React.createElement('div', null, React.createElement('label', { className: 'text-sm font-medium' }, 'Venue (optional)'), React.createElement(Input, { value: fixtureForm.venue, onChange: function (e) { setFixtureForm(function (f) { return Object.assign({}, f, { venue: e.target.value }); }); }, placeholder: 'e.g. Bramley BC', className: 'mt-1' }))
        ),
        React.createElement(DialogFooter, null, React.createElement(Button, { variant: 'outline', onClick: function () { setFixtureDialog(false); } }, 'Cancel'), React.createElement(Button, { onClick: submitFixture, disabled: createFixture.isPending }, 'Create'))
      )
    )
  );
}