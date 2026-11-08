import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GreenSelector from '@/components/booking/GreenSelector';
import { isDualGreens, getGreenTypes, getRinkConfig } from '@/lib/rinkConfig';
import { Zap, List, Plus, Loader2, Trash2 } from 'lucide-react';

const rinkCountForGreen = (club, green) => getRinkConfig(club, green).rink_count || 6;

// Create / edit league dialog — all of its values and setters live on the LeagueAdmin page
export default function LeagueFormDialog({
  open,
  onCancel,
  editingLeague,
  club,
  onSave,
  isSaving,
  leagueName, setLeagueName,
  leagueDescription, setLeagueDescription,
  leagueStartDate, setLeagueStartDate,
  leagueEndDate, setLeagueEndDate,
  leagueCreationMode, setLeagueCreationMode,
  leagueMultiSession, setLeagueMultiSession,
  leagueSelectedSessions, setLeagueSelectedSessions,
  leagueStartTime, setLeagueStartTime,
  leagueEndTime, setLeagueEndTime,
  leagueFormat, setLeagueFormat,
  leagueSessionTime, setLeagueSessionTime,
  leagueAdjacentRinks, setLeagueAdjacentRinks,
  leagueAdjacentPeriods, setLeagueAdjacentPeriods,
  leagueGreenType, setLeagueGreenType,
  leagueRinks, setLeagueRinks,
  leagueForceEven, setLeagueForceEven,
  leagueIsDoubleRink, setLeagueIsDoubleRink,
  leagueIsSets, setLeagueIsSets,
  leagueSetsEnds, setLeagueSetsEnds,
  scoringPointsPerSet, setScoringPointsPerSet,
  scoringPointsPerSetValue, setScoringPointsPerSetValue,
  scoringGameWin, setScoringGameWin,
  scoringGameWinValue, setScoringGameWinValue,
  scoringStandardWin, setScoringStandardWin,
  scoringHighestShots, setScoringHighestShots,
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>{editingLeague ? 'Edit League' : 'Create League'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Creation Mode selector — only shown when creating a new league */}
          {!editingLeague && (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <Label className="font-semibold">Fixture Creation Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLeagueCreationMode('auto')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${leagueCreationMode === 'auto' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-sm">Automatic</span>
                  </div>
                  <p className="text-xs text-slate-500">Generate fixtures from dates & teams using round-robin scheduling</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLeagueCreationMode('manual')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${leagueCreationMode === 'manual' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <List className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Manual</span>
                  </div>
                  <p className="text-xs text-slate-500">Enter fixtures yourself — ideal for migrating existing leagues</p>
                </button>
              </div>
            </div>
          )}
          <div>
            <Label>League Name *</Label>
            <Input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="e.g., Winter League 2024"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={leagueDescription}
              onChange={(e) => setLeagueDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={leagueStartDate}
                onChange={(e) => setLeagueStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={leagueEndDate}
                onChange={(e) => setLeagueEndDate(e.target.value)}
              />
            </div>
          </div>
          {club?.use_custom_sessions && club?.custom_sessions?.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Match Session *</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="multi-session"
                    checked={leagueMultiSession}
                    onCheckedChange={(checked) => {
                      setLeagueMultiSession(checked);
                      setLeagueSelectedSessions([]);
                      if (!checked) {
                        // reset to single session defaults
                        setLeagueStartTime(club.custom_sessions[0]?.start || '18:00');
                        setLeagueEndTime(club.custom_sessions[0]?.end || '21:00');
                      }
                    }}
                  />
                  <Label htmlFor="multi-session" className="cursor-pointer text-sm font-normal">League spans multiple sessions</Label>
                </div>
              </div>
              <p className="text-xs text-gray-500">Toggle this for when a league takes up multiple sessions e.g. 6–7pm and 7–8pm.</p>
              {leagueMultiSession ? (
                <div className="space-y-2">
                  {club.custom_sessions.map((session, i) => {
                    const isSelected = leagueSelectedSessions.some(s => s.start === session.start && s.end === session.end);
                    return (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setLeagueSelectedSessions(prev =>
                              checked
                                ? [...prev, { start: session.start, end: session.end }]
                                : prev.filter(s => !(s.start === session.start && s.end === session.end))
                            );
                          }}
                        />
                        <span className="text-sm">{session.start} – {session.end}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Select
                  value={`${leagueStartTime}|${leagueEndTime}`}
                  onValueChange={(v) => {
                    const [s, e] = v.split('|');
                    setLeagueStartTime(s);
                    setLeagueEndTime(e);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {club.custom_sessions.map((session, i) => (
                      <SelectItem key={i} value={`${session.start}|${session.end}`}>
                        {session.start} – {session.end}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Match Start Time *</Label>
                  <Input
                    type="time"
                    value={leagueStartTime}
                    onChange={(e) => setLeagueStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Match End Time *</Label>
                  <Input
                    type="time"
                    value={leagueEndTime}
                    onChange={(e) => setLeagueEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <div>
            <Label>Format</Label>
            <Select value={leagueFormat} onValueChange={setLeagueFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="triples">Triples (3 players)</SelectItem>
                <SelectItem value="fours">Fours (4 players)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Typical Session Time</Label>
            <Input
              value={leagueSessionTime}
              onChange={(e) => setLeagueSessionTime(e.target.value)}
              placeholder="e.g. 2:00pm"
            />
            <p className="text-xs text-gray-500 mt-1">Shown on printed league tables</p>
          </div>
          {/* Adjacent Rinks (outdoor only) — auto mode only */}
          {leagueCreationMode === 'auto' && club?.season === 'outdoor' && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="adjacent-rinks"
                  checked={leagueAdjacentRinks}
                  onCheckedChange={(checked) => {
                    setLeagueAdjacentRinks(checked);
                    if (checked && leagueAdjacentPeriods.length === 0) {
                      setLeagueAdjacentPeriods([{ start_date: leagueStartDate || '', end_date: leagueEndDate || '', rinks: [] }]);
                    }
                  }}
                />
                <div>
                  <Label htmlFor="adjacent-rinks" className="cursor-pointer">Adjacent Rinks</Label>
                  <p className="text-xs text-gray-500">Cluster fixtures together on adjacent rinks</p>
                </div>
              </div>
              {leagueAdjacentRinks && (
                <div className="space-y-4">
                  {leagueAdjacentPeriods.map((period, idx) => {
                    const rinkCount = rinkCountForGreen(club, leagueGreenType);
                    const allRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);
                    // Check overlap with other periods
                    const overlaps = leagueAdjacentPeriods.some((p, i) => {
                      if (i === idx) return false;
                      return period.start_date && period.end_date && p.start_date && p.end_date &&
                        period.start_date <= p.end_date && period.end_date >= p.start_date;
                    });
                    return (
                      <div key={idx} className={`border rounded-lg p-3 space-y-3 ${overlaps ? 'border-red-400 bg-red-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">Period {idx + 1}</p>
                          {leagueAdjacentPeriods.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500"
                              onClick={() => setLeagueAdjacentPeriods(prev => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        {overlaps && <p className="text-xs text-red-600">⚠ This period overlaps with another period</p>}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input type="date" value={period.start_date}
                              onChange={(e) => setLeagueAdjacentPeriods(prev => prev.map((p, i) => i === idx ? { ...p, start_date: e.target.value } : p))} />
                          </div>
                          <div>
                            <Label className="text-xs">End Date</Label>
                            <Input type="date" value={period.end_date}
                              onChange={(e) => setLeagueAdjacentPeriods(prev => prev.map((p, i) => i === idx ? { ...p, end_date: e.target.value } : p))} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs mb-2 block">Cluster Rinks</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {allRinks.map(rinkNum => (
                              <label key={rinkNum} className="flex items-center gap-2 cursor-pointer select-none">
                                <Checkbox
                                  checked={period.rinks.includes(rinkNum)}
                                  onCheckedChange={(checked) => {
                                    setLeagueAdjacentPeriods(prev => prev.map((p, i) =>
                                      i === idx ? { ...p, rinks: checked ? [...p.rinks, rinkNum].sort((a,b)=>a-b) : p.rinks.filter(r => r !== rinkNum) } : p
                                    ));
                                  }}
                                />
                                <span className="text-sm">Rink {rinkNum}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() =>
                    setLeagueAdjacentPeriods(prev => [...prev, { start_date: '', end_date: '', rinks: [] }])
                  }>
                    <Plus className="w-3 h-3 mr-1" /> Add Period
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Which green the league is played on — dual-green clubs only */}
          {club && isDualGreens(club) && leagueCreationMode === 'auto' && (
            <div className="border rounded-lg p-4 space-y-2">
              <Label className="font-medium">Which green is this league played on?</Label>
              <GreenSelector
                greens={getGreenTypes(club)}
                value={leagueGreenType}
                onChange={(green) => {
                  setLeagueGreenType(green);
                  setLeagueRinks([]);
                }}
              />
              <p className="text-xs text-gray-500">Fixtures are booked onto this green's rinks.</p>
            </div>
          )}

          {/* Rink selection — auto mode only, hidden when Adjacent Rinks is on */}
          {leagueCreationMode === 'auto' && club && !leagueAdjacentRinks && (
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label className="font-medium">Rinks for this league</Label>
                <p className="text-xs text-gray-500 mt-0.5">Select which rinks will be used when generating fixtures. Leave all unchecked to use all club rinks.</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {Array.from({ length: rinkCountForGreen(club, leagueGreenType) }, (_, i) => i + 1).map(rinkNum => (
                  <label key={rinkNum} className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={leagueRinks.includes(rinkNum)}
                      onCheckedChange={(checked) => {
                        setLeagueRinks(prev =>
                          checked ? [...prev, rinkNum].sort((a, b) => a - b) : prev.filter(r => r !== rinkNum)
                        );
                      }}
                    />
                    <span className="text-sm">Rink {rinkNum}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {leagueCreationMode === 'auto' && <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="force-even"
                checked={leagueForceEven}
                onCheckedChange={setLeagueForceEven}
              />
              <div>
                <Label htmlFor="force-even" className="cursor-pointer">Force even number of games between teams</Label>
                <p className="text-xs text-gray-500">When enabled, each team plays every other team the same number of times. When disabled, fixtures fill the full league duration.</p>
              </div>
            </div>
          </div>}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="is-double-rink"
                checked={leagueIsDoubleRink}
                onCheckedChange={setLeagueIsDoubleRink}
              />
              <div>
                <Label htmlFor="is-double-rink" className="cursor-pointer">Double Rink League</Label>
                <p className="text-xs text-gray-500">Each meeting produces two matches on adjacent rinks, with a combined-score bonus.</p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="is-sets"
                checked={leagueIsSets}
                onCheckedChange={setLeagueIsSets}
              />
              <Label htmlFor="is-sets" className="cursor-pointer">Is Sets?</Label>
            </div>
            {leagueIsSets && (
              <div className="space-y-4">
                <div>
                  <Label>Number of Ends per Set</Label>
                  <Input
                    type="number"
                    min="1"
                    max="21"
                    value={leagueSetsEnds}
                    onChange={(e) => setLeagueSetsEnds(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The scorecard will split into sets of this many ends, with a TOTAL row between each set.
                  </p>
                </div>
                {/* Scoring Configuration */}
                <div className="border rounded-lg p-4 space-y-4 bg-purple-50 border-purple-200">
                  <p className="text-sm font-semibold text-purple-800">Scoring Configuration</p>

                  {/* Points per set */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="scoring-per-set"
                        checked={scoringPointsPerSet}
                        onCheckedChange={setScoringPointsPerSet}
                      />
                      <Label htmlFor="scoring-per-set" className="cursor-pointer">Award points per set win</Label>
                    </div>
                    {scoringPointsPerSet && (
                      <div className="ml-7 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={scoringPointsPerSetValue}
                          onChange={(e) => setScoringPointsPerSetValue(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">points per set win (draws = half)</span>
                      </div>
                    )}
                  </div>

                  {/* Points for game win */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="scoring-game-win"
                        checked={scoringGameWin}
                        onCheckedChange={setScoringGameWin}
                      />
                      <Label htmlFor="scoring-game-win" className="cursor-pointer">Award points for game win (winning more sets)</Label>
                    </div>
                    {scoringGameWin && (
                      <div className="ml-7 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={scoringGameWinValue}
                          onChange={(e) => setScoringGameWinValue(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">points for game win</span>
                      </div>
                    )}
                  </div>

                  {/* Standard win */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="scoring-standard-win"
                      checked={scoringStandardWin}
                      onCheckedChange={setScoringStandardWin}
                    />
                    <Label htmlFor="scoring-standard-win" className="cursor-pointer">Use standard 2 points per win</Label>
                  </div>

                  {/* Highest overall shots */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="scoring-highest-shots"
                      checked={scoringHighestShots}
                      onCheckedChange={setScoringHighestShots}
                    />
                    <Label htmlFor="scoring-highest-shots" className="cursor-pointer">Award 1 point for highest overall shots</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingLeague ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}