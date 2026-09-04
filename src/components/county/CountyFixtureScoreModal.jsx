import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Trophy, Calendar, MapPin, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function CountyFixtureScoreModal({ countyId, fixture, league, teams, canAdmin, onClose }) {
  const qc = useQueryClient();
  const homeTeam = teams.find(t => t.id === fixture.home_team_id);
  const awayTeam = teams.find(t => t.id === fixture.away_team_id);
  const isSets = league?.is_sets;

  const hasPending = fixture.pending_submitted_by_email != null;
  const hasConflict = fixture.conflict_first_home_score != null;
  const isCompleted = fixture.status === 'completed';

  const [resolveMode, setResolveMode] = useState(false);
  const [submitterSide, setSubmitterSide] = useState('home');
  const [homeScore, setHomeScore] = useState(hasPending ? String(fixture.pending_home_score ?? '') : '');
  const [awayScore, setAwayScore] = useState(hasPending ? String(fixture.pending_away_score ?? '') : '');
  const [homeSets, setHomeSets] = useState(hasPending ? String(fixture.pending_home_sets ?? '') : '');
  const [awaySets, setAwaySets] = useState(hasPending ? String(fixture.pending_away_sets ?? '') : '');
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['countyLeagueFixtures'] });

  const submit = async (asResolve) => {
    if (homeScore === '' || awayScore === '') { toast.error('Enter both scores'); return; }
    if (isSets && (homeSets === '' || awaySets === '')) { toast.error('Enter both set counts'); return; }
    setSaving(true);
    try {
      const payload = {
        countyId, fixtureId: fixture.id,
        homeScore: parseInt(homeScore), awayScore: parseInt(awayScore),
        isSetsLeague: isSets,
        homeSets: isSets ? parseInt(homeSets) : null,
        awaySets: isSets ? parseInt(awaySets) : null,
      };
      if (asResolve) {
        payload.resolve = true;
      } else {
        payload.submitterTeamId = submitterSide === 'home' ? fixture.home_team_id : fixture.away_team_id;
      }
      const res = await base44.functions.invoke('updateCountyFixtureScore', payload);
      toast.success(res.message || 'Score submitted');
      refresh();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Failed to submit score');
    } finally {
      setSaving(false);
    }
  };

  const conflictTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unknown';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-emerald-600" />Enter Match Result</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="w-4 h-4" />{format(parseISO(fixture.match_date), 'EEEE d MMMM yyyy')}</div>
            {fixture.venue && <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin className="w-4 h-4" />{fixture.venue}</div>}
            {league && <Badge className="bg-emerald-100 text-emerald-700 border-0">{league.name}</Badge>}
            <div className="flex items-center justify-between pt-2">
              <div className="text-center flex-1"><p className="font-semibold text-sm">{homeTeam?.name || 'Home'}</p><p className="text-xs text-gray-400">Home</p></div>
              <span className="text-gray-400 font-bold px-3">vs</span>
              <div className="text-center flex-1"><p className="font-semibold text-sm">{awayTeam?.name || 'Away'}</p><p className="text-xs text-gray-400">Away</p></div>
            </div>
          </div>

          {isCompleted && !resolveMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="font-semibold">{homeTeam?.name} {fixture.home_score} – {fixture.away_score} {awayTeam?.name}</p>
              {isSets && <p className="text-sm text-gray-500">Sets: {fixture.home_sets}–{fixture.away_sets}</p>}
              {canAdmin && <Button size="sm" variant="outline" className="mt-2" onClick={() => setResolveMode(true)}>Edit Result</Button>}
            </div>
          )}

          {hasConflict && !resolveMode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-red-700"><AlertCircle className="w-4 h-4" /><span className="font-semibold">Score Conflict</span></div>
              <div className="text-sm space-y-1">
                <p>1st: {conflictTeamName(fixture.conflict_first_team_id)} — {homeTeam?.name} {fixture.conflict_first_home_score}–{fixture.conflict_first_away_score} {awayTeam?.name}</p>
                <p>2nd: {conflictTeamName(fixture.conflict_second_team_id)} — {homeTeam?.name} {fixture.conflict_second_home_score}–{fixture.conflict_second_away_score} {awayTeam?.name}</p>
              </div>
              {canAdmin && <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setResolveMode(true)}><ShieldAlert className="w-4 h-4 mr-1" />Resolve Conflict</Button>}
            </div>
          )}

          {hasPending && !hasConflict && !isCompleted && !resolveMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Waiting for confirmation. Submitted: {homeTeam?.name} {fixture.pending_home_score}–{fixture.pending_away_score} {awayTeam?.name}
              {isSets && ` (Sets: ${fixture.pending_home_sets}–${fixture.pending_away_sets})`}
            </div>
          )}

          {(!isCompleted || resolveMode) && (
            <>
              {resolveMode && <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm text-blue-800"><ShieldAlert className="w-4 h-4 inline mr-1" />County admin: enter the correct result directly.</div>}
              {!resolveMode && !hasConflict && (
                <div>
                  <Label className="text-xs">I am submitting as:</Label>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant={submitterSide === 'home' ? 'default' : 'outline'} onClick={() => setSubmitterSide('home')}>{homeTeam?.name || 'Home'}</Button>
                    <Button size="sm" variant={submitterSide === 'away' ? 'default' : 'outline'} onClick={() => setSubmitterSide('away')}>{awayTeam?.name || 'Away'}</Button>
                  </div>
                </div>
              )}
              {isSets && (
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div><Label className="text-xs block mb-1">{homeTeam?.name || 'Home'}</Label><Input type="number" min="0" value={homeSets} onChange={e => setHomeSets(e.target.value)} className="text-center" placeholder="0" /></div>
                  <div className="text-center text-gray-400 text-sm pt-5">sets</div>
                  <div><Label className="text-xs block mb-1">{awayTeam?.name || 'Away'}</Label><Input type="number" min="0" value={awaySets} onChange={e => setAwaySets(e.target.value)} className="text-center" placeholder="0" /></div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 items-center">
                <div><Input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)} className="text-center text-lg font-bold" placeholder="0" /></div>
                <div className="text-center text-gray-400 font-bold pt-4">–</div>
                <div><Input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)} className="text-center text-lg font-bold" placeholder="0" /></div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {(!isCompleted || resolveMode) && (
            <Button onClick={() => submit(resolveMode)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{resolveMode ? 'Save Result' : 'Submit Result'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}