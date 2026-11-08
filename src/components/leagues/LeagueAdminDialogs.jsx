import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Pencil, Printer, ClipboardList } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getPrimaryGreen, getRinkConfig, isDualGreens } from '@/lib/rinkConfig';
import { parseSetsValue } from '@/lib/leagueScoring';
import LeagueScoresModal from '@/components/leagues/LeagueScoresModal';
import RinkDistributionModal from '@/components/leagues/RinkDistributionModal';
import BlacklistDatesDialog from '@/components/leagues/BlacklistDatesDialog';
import RinkClashModal from '@/components/booking/RinkClashModal';
import LeagueTableDialog from '@/components/leagues/LeagueTableDialog';
import ManualFixturesModal from '@/components/leagues/ManualFixturesModal';
import TeamFixturesDialog, {
  printFixtures as printTeamFixtures,
  printBlankRota as printTeamBlankRota,
} from '@/components/leagues/TeamFixturesDialog';

const greenForLeague = (club, league) => {
  if (!isDualGreens(club)) return getPrimaryGreen(club);
  return league?.green_type === 'indoor' || league?.green_type === 'outdoor'
    ? league.green_type
    : getPrimaryGreen(club);
};
const rinkCountForGreen = (club, green) => getRinkConfig(club, green).rink_count || 6;

// Fixture, score, scorecard and scheduling dialogs used by the LeagueAdmin page
export default function LeagueAdminDialogs({
  club,
  clubId,
  leagues,
  teams,
  fixtures,
  // Fixtures dialog
  fixturesDialogOpen,
  setFixturesDialogOpen,
  viewingLeague,
  fixturesTeamFilter,
  setFixturesTeamFilter,
  openScoreDialog,
  // Score dialog
  scoreDialogOpen,
  setScoreDialogOpen,
  editingFixture,
  homeScore, setHomeScore,
  awayScore, setAwayScore,
  homeSets, setHomeSets,
  awaySets, setAwaySets,
  hadTiebreak, setHadTiebreak,
  tiebreakWinner, setTiebreakWinner,
  handleSaveScore,
  // Scores modal
  scoresModalOpen,
  setScoresModalOpen,
  scoresModalLeague,
  // Rink distribution modal
  distributionModalOpen,
  setDistributionModalOpen,
  pendingFixtures,
  pendingFixtureTeams,
  pendingFixtureLeague,
  pendingIsRealloc,
  handleRegenerateAllocations,
  handleRegenerateFixtures,
  handleConfirmFixtures,
  generatingFixtures,
  // Blacklist dates dialog
  blacklistDialogOpen,
  setBlacklistDialogOpen,
  blacklistLeague,
  // Rink clash modal
  clashModalOpen,
  setClashModalOpen,
  clashData,
  handleLeagueClashProceed,
  bookingRinks,
  // Team fixtures dialog
  teamFixtures,
  setTeamFixtures,
  // League table dialog
  tableDialogOpen,
  setTableDialogOpen,
  viewingTableLeague,
  // Scorecard date filter dialog
  scorecardDialogLeague,
  setScorecardDialogLeague,
  scorecardMatchDate,
  setScorecardMatchDate,
  handlePrintScorecards,
  // Manual fixtures modal
  manualFixturesModalOpen,
  setManualFixturesModalOpen,
  manualFixturesLeague,
  onManualFixturesClose,
}) {
  return (
    <>
      {/* Fixtures Dialog */}
      <Dialog open={fixturesDialogOpen} onOpenChange={() => setFixturesDialogOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{viewingLeague?.name} - Fixtures</DialogTitle>
          </DialogHeader>
          {viewingLeague && (() => {
            const leagueTeamsList = teams.filter(t => t.league_id === viewingLeague.id);
            const sortedFixtures = fixtures
              .filter(f => f.league_id === viewingLeague.id &&
                (fixturesTeamFilter === 'all' || f.home_team_id === fixturesTeamFilter || f.away_team_id === fixturesTeamFilter))
              .sort((a, b) => {
                const dateCmp = a.match_date.localeCompare(b.match_date);
                if (dateCmp !== 0) return dateCmp;
                if (a.tie_id && b.tie_id) {
                  const tieCmp = a.tie_id.localeCompare(b.tie_id);
                  if (tieCmp !== 0) return tieCmp;
                  return (a.leg || 1) - (b.leg || 1);
                }
                return 0;
              });
            const selectedTeam = leagueTeamsList.find(t => t.id === fixturesTeamFilter);
            const printableFixtures = sortedFixtures.filter(f => f.status !== 'cancelled');
            return (
              <div className="space-y-4">
                <div>
                  <Label>Team</Label>
                  <Select value={fixturesTeamFilter} onValueChange={setFixturesTeamFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {leagueTeamsList.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {sortedFixtures.map(fixture => {
                    const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                    const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                    return (
                      <div key={fixture.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-500 w-24">
                            {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{homeTeam?.name || 'Unknown'}</span>
                            <span className="text-gray-400">vs</span>
                            <span className="font-medium">{awayTeam?.name || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Rink {fixture.rink_number}</Badge>
                          {viewingLeague?.is_double_rink && fixture.tie_id && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600">Leg {fixture.leg || 1}</Badge>
                          )}
                          {fixture.status === 'completed' ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              {fixture.home_score} - {fixture.away_score}
                            </Badge>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openScoreDialog(fixture)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {sortedFixtures.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No fixtures generated yet</p>
                  )}
                </div>
                {selectedTeam && printableFixtures.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => printTeamBlankRota(viewingLeague, selectedTeam, printableFixtures, teams)}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Print Blank Rota
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => printTeamFixtures(viewingLeague, selectedTeam, printableFixtures, teams)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Fixtures
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Score Dialog */}
      <Dialog open={scoreDialogOpen} onOpenChange={() => setScoreDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Enter Score</DialogTitle>
          </DialogHeader>
          {editingFixture && (() => {
            const scoringLeague = viewingLeague || leagues.find(l => l.id === editingFixture.league_id);
            const isSetsLeague = scoringLeague?.is_sets;
            const homeTeam = teams.find(t => t.id === editingFixture.home_team_id);
            const awayTeam = teams.find(t => t.id === editingFixture.away_team_id);
            return (
              <div className="space-y-4">
                <div className="text-center text-sm text-gray-500">
                  {format(parseISO(editingFixture.match_date), 'd MMM yyyy')}
                </div>
                {isSetsLeague && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 text-center mb-2">Sets Won</p>
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="text-right">
                        <Label className="block mb-2 text-xs">{homeTeam?.name}</Label>
                        <Input type="number" min="0" step="0.5" inputMode="decimal" value={homeSets} onChange={(e) => setHomeSets(e.target.value)} className="text-center" placeholder="0" />
                      </div>
                      <div className="text-center text-gray-400 pt-6 text-sm">sets</div>
                      <div className="text-left">
                        <Label className="block mb-2 text-xs">{awayTeam?.name}</Label>
                        <Input type="number" min="0" step="0.5" inputMode="decimal" value={awaySets} onChange={(e) => setAwaySets(e.target.value)} className="text-center" placeholder="0" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-1">Enter 0.5 for each drawn set (e.g. 2.5 – 1.5 means one set was drawn)</p>
                    {homeSets !== '' && awaySets !== '' && parseSetsValue(homeSets) === parseSetsValue(awaySets) && (
                      <p className="text-xs text-red-600 font-medium text-center mt-2">Sets level – add tiebreak winner</p>
                    )}
                    <div className="flex flex-col items-center gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Tiebreak played</Label>
                        <Switch
                          checked={hadTiebreak}
                          onCheckedChange={(v) => { setHadTiebreak(v); if (!v) setTiebreakWinner(null); }}
                        />
                      </div>
                      {hadTiebreak && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={tiebreakWinner === 'home' ? 'default' : 'outline'}
                            className={tiebreakWinner === 'home' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => setTiebreakWinner('home')}
                          >
                            {homeTeam?.name || 'Home'}
                          </Button>
                          <Button
                            size="sm"
                            variant={tiebreakWinner === 'away' ? 'default' : 'outline'}
                            className={tiebreakWinner === 'away' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => setTiebreakWinner('away')}
                          >
                            {awayTeam?.name || 'Away'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 text-center mb-2">Total Shots</p>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-right">
                      {!isSetsLeague && <Label className="block mb-2">{homeTeam?.name}</Label>}
                      <Input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className="text-center" />
                    </div>
                    <div className="text-center text-gray-400 pt-6">vs</div>
                    <div className="text-left">
                      {!isSetsLeague && <Label className="block mb-2">{awayTeam?.name}</Label>}
                      <Input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className="text-center" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveScore} className="bg-emerald-600 hover:bg-emerald-700">
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* League Scores Modal */}
      <LeagueScoresModal
        open={scoresModalOpen}
        onClose={() => setScoresModalOpen(false)}
        league={scoresModalLeague}
        fixtures={fixtures}
        teams={teams}
        clubId={clubId}
      />

      {/* Rink Distribution Preview Modal */}
      <RinkDistributionModal
        open={distributionModalOpen}
        onClose={() => setDistributionModalOpen(false)}
        fixtures={pendingFixtures}
        teams={pendingFixtureTeams}
        rinkCount={rinkCountForGreen(club, greenForLeague(club, pendingFixtureLeague))}
        league={pendingFixtureLeague}
        leagueRinks={pendingFixtureLeague?.league_rinks}
        onRegenerate={pendingIsRealloc ? handleRegenerateAllocations : handleRegenerateFixtures}
        onConfirm={handleConfirmFixtures}
        isRealloc={pendingIsRealloc}
        isLoading={generatingFixtures}
      />

      {/* Blacklist Dates Dialog */}
      <BlacklistDatesDialog
        open={blacklistDialogOpen}
        onClose={() => setBlacklistDialogOpen(false)}
        league={blacklistLeague ? (leagues.find(l => l.id === blacklistLeague.id) || blacklistLeague) : null}
        clubId={clubId}
      />

      {/* Rink Clash Modal */}
      <RinkClashModal
        open={clashModalOpen}
        clashes={clashData.clashes}
        nonClashingBookings={clashData.nonClashingBookings}
        allBookings={clashData.allExistingBookings}
        club={club}
        onProceed={handleLeagueClashProceed}
        onClose={() => setClashModalOpen(false)}
        isLoading={bookingRinks}
      />

      {/* Team Fixtures Dialog */}
      <TeamFixturesDialog
        open={!!teamFixtures}
        onClose={() => setTeamFixtures(null)}
        league={teamFixtures?.league}
        team={teamFixtures?.team}
        fixtures={fixtures}
        teams={teams}
      />

      {/* League Table Dialog */}
      <LeagueTableDialog
        open={tableDialogOpen}
        onOpenChange={(open) => { if (!open) setTableDialogOpen(false); }}
        league={viewingTableLeague}
        teams={teams}
        fixtures={fixtures}
        club={club}
        clubId={clubId}
      />

      {/* Scorecard Date Filter Dialog */}
      {scorecardDialogLeague && (() => {
        const leagueFixtureDates = [...new Set(
          fixtures
            .filter(f => f.league_id === scorecardDialogLeague.id)
            .map(f => f.match_date)
        )].sort();
        return (
          <Dialog open={!!scorecardDialogLeague} onOpenChange={(open) => { if (!open) setScorecardDialogLeague(null); }}>
            <DialogContent className="mx-4 sm:mx-auto max-w-md">
              <DialogHeader>
                <DialogTitle>Print Scorecards — {scorecardDialogLeague.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-600">Print all scorecards, or select a specific fixture date to print only that round.</p>
                {leagueFixtureDates.length > 0 && (
                  <div>
                    <Label>Fixture Date (optional)</Label>
                    <Select value={scorecardMatchDate} onValueChange={setScorecardMatchDate}>
                      <SelectTrigger>
                        <SelectValue placeholder="All dates" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagueFixtureDates.map(d => (
                          <SelectItem key={d} value={d}>
                            {format(new Date(d + 'T12:00:00'), 'EEEE d MMM yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setScorecardDialogLeague(null)}>Cancel</Button>
                {scorecardMatchDate && (
                  <Button
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handlePrintScorecards(scorecardDialogLeague, scorecardMatchDate)}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print This Date
                  </Button>
                )}
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handlePrintScorecards(scorecardDialogLeague, null)}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print All
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Manual Fixtures Modal */}
      <ManualFixturesModal
        open={manualFixturesModalOpen}
        onClose={onManualFixturesClose}
        league={manualFixturesLeague}
        teams={manualFixturesLeague ? teams.filter(t => t.league_id === manualFixturesLeague.id) : []}
        clubId={clubId}
        existingFixtures={fixtures}
        rinkCount={rinkCountForGreen(club, greenForLeague(club, manualFixturesLeague))}
        club={club}
      />
    </>
  );
}