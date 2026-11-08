import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPrimaryGreen, getRinkConfig, isDualGreens, getBookingGreen } from '@/lib/rinkConfig';
import GreenFilter from '@/components/common/GreenFilter';
import { matchesGreenFilter } from '@/lib/greenFilters';

/** The green a league's fixtures are played and booked on. */
const greenForLeague = (club, league) => {
  if (!isDualGreens(club)) return getPrimaryGreen(club);
  return league?.green_type === 'indoor' || league?.green_type === 'outdoor'
    ? league.green_type
    : getPrimaryGreen(club);
};
const rinkCountForGreen = (club, green) => getRinkConfig(club, green).rink_count || 6;
const primaryRinkCount = (club) => rinkCountForGreen(club, getPrimaryGreen(club));
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Trophy, 
  Loader2, 
  ShieldAlert,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Zap,
  List,
  CalendarCheck,
  BarChart3,
  Printer,
  CalendarX,
  Archive,
  RefreshCw,
  Shuffle,
  Settings,
  ChevronDown
} from 'lucide-react';
import TeamDialog from '@/components/leagues/TeamDialog';
import LeagueFormDialog from '@/components/leagues/LeagueFormDialog';
import LeagueAdminDialogs from '@/components/leagues/LeagueAdminDialogs';
import BookingProgressOverlay from '@/components/leagues/BookingProgressOverlay';
import LeagueAdminTableView from '@/components/leagues/LeagueAdminTableView';
import LeagueArchiveSection from '@/components/leagues/LeagueArchiveSection';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';
import { buildFixtureList as buildFixturesForLeague, reassignRinkAllocations } from '@/lib/leagueFixtureGenerator';
import { parseSetsValue } from '@/lib/leagueScoring';
import LeagueSearchSelect from '@/components/leagues/LeagueSearchSelect';
import LeagueFocusView from '@/components/leagues/LeagueFocusView';
import LeagueTeamsSection from '@/components/leagues/LeagueTeamsSection';

export default function LeagueAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [leagueDialogOpen, setLeagueDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [deleteLeagueId, setDeleteLeagueId] = useState(null);
  const [deleteTeamId, setDeleteTeamId] = useState(null);

  const [leagueName, setLeagueName] = useState('');
  const [leagueDescription, setLeagueDescription] = useState('');
  const [leagueStatus, setLeagueStatus] = useState('draft');
  const [leagueStartDate, setLeagueStartDate] = useState('');
  const [leagueEndDate, setLeagueEndDate] = useState('');
  const [leagueStartTime, setLeagueStartTime] = useState('18:00');
  const [leagueEndTime, setLeagueEndTime] = useState('21:00');
  const [leagueFormat, setLeagueFormat] = useState('fours');
  const [leagueGreenType, setLeagueGreenType] = useState('indoor');
  const [leagueGreenFilter, setLeagueGreenFilter] = useState('all');
  const [leagueIsSets, setLeagueIsSets] = useState(false);
  const [leagueIsDoubleRink, setLeagueIsDoubleRink] = useState(false);
  const [leagueSetsEnds, setLeagueSetsEnds] = useState(8);
  const [leagueForceEven, setLeagueForceEven] = useState(true);
  const [leagueRinks, setLeagueRinks] = useState([]);
  const [leagueSessionTime, setLeagueSessionTime] = useState('');
  const [leagueMultiSession, setLeagueMultiSession] = useState(false);
  const [leagueSelectedSessions, setLeagueSelectedSessions] = useState([]);
  const [leagueAdjacentRinks, setLeagueAdjacentRinks] = useState(false);
  const [leagueAdjacentPeriods, setLeagueAdjacentPeriods] = useState([]); // [{start_date, end_date, rinks:[]}]

  // Sets scoring config
  const [scoringPointsPerSet, setScoringPointsPerSet] = useState(false);
  const [scoringPointsPerSetValue, setScoringPointsPerSetValue] = useState(1);
  const [scoringGameWin, setScoringGameWin] = useState(false);
  const [scoringGameWinValue, setScoringGameWinValue] = useState(1);
  const [scoringStandardWin, setScoringStandardWin] = useState(false);
  const [scoringHighestShots, setScoringHighestShots] = useState(false);

  // Rink distribution preview state
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [pendingFixtures, setPendingFixtures] = useState([]);
  const [pendingFixtureLeague, setPendingFixtureLeague] = useState(null);
  const [pendingFixtureTeams, setPendingFixtureTeams] = useState([]);
  const [regenerateCounter, setRegenerateCounter] = useState(0);
  // Regenerate fixtures (rebuild existing fixtures + bookings from current league settings)
  const [regenDialogLeague, setRegenDialogLeague] = useState(null);
  const [regeneratingFixtures, setRegeneratingFixtures] = useState(false);
  const [pendingIsRegeneration, setPendingIsRegeneration] = useState(false);

  // Regenerate Rink Allocations (redraw rink numbers only, keep fixtures)
  const [pendingIsRealloc, setPendingIsRealloc] = useState(false);
  const [reallocSourceFixtures, setReallocSourceFixtures] = useState(null);

  // Batch booking/cancellation progress {phase, done, total}
  const [bookingProgress, setBookingProgress] = useState(null);
  // League deletion progress {phase, done, total, note}
  const [deleteProgress, setDeleteProgress] = useState(null);

  const [teamName, setTeamName] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');

  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [fixturesDialogOpen, setFixturesDialogOpen] = useState(false);
  const [fixturesTeamFilter, setFixturesTeamFilter] = useState('all');
  const [viewingLeague, setViewingLeague] = useState(null);
  const [bookingRinks, setBookingRinks] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [homeSets, setHomeSets] = useState('');
  const [awaySets, setAwaySets] = useState('');
  const [hadTiebreak, setHadTiebreak] = useState(false);
  const [tiebreakWinner, setTiebreakWinner] = useState(null);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [viewingTableLeague, setViewingTableLeague] = useState(null);
  const [scoresModalOpen, setScoresModalOpen] = useState(false);
  const [scoresModalLeague, setScoresModalLeague] = useState(null);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [blacklistLeague, setBlacklistLeague] = useState(null);
  const [clashModalOpen, setClashModalOpen] = useState(false);
  const [clashData, setClashData] = useState({ clashes: [], nonClashingBookings: [], league: null, leagueFixturesForBooking: [], allExistingBookings: [] });
  const [manualFixturesModalOpen, setManualFixturesModalOpen] = useState(false);
  const [manualFixturesLeague, setManualFixturesLeague] = useState(null);
  const [leagueCreationMode, setLeagueCreationMode] = useState('auto');
  const [showArchive, setShowArchive] = useState(false);
  const [teamFixtures, setTeamFixtures] = useState(null);
  const [archiveLeagueId, setArchiveLeagueId] = useState(null);

  // League focus selector ('all' or a league id) — distinct from selectedLeague (team dialog)
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState('all');
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Scorecard date filter dialog
  const [scorecardDialogLeague, setScorecardDialogLeague] = useState(null);
  const [scorecardMatchDate, setScorecardMatchDate] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const { data: fixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  // Sort leagues by playing day then start time (Monday 10am first, Monday 6pm next, Tuesday…)
  // The playing day comes from the league start date (fixtures run weekly from it)
  const leagueDayTimeSort = (a, b) => {
    const dayIdx = (l) => {
      if (!l.start_date) return 7; // leagues without a start date go last
      return (parseISO(l.start_date).getDay() + 6) % 7; // Monday=0 … Sunday=6
    };
    const dayCmp = dayIdx(a) - dayIdx(b);
    if (dayCmp !== 0) return dayCmp;
    return (a.start_time || '').localeCompare(b.start_time || '');
  };

  // Leagues split into active and archived (completed) sections
  const activeLeagues = leagues
    .filter(l => matchesGreenFilter(greenForLeague(club, l), leagueGreenFilter))
    .filter(l => l.status !== 'completed')
    .sort(leagueDayTimeSort);
  const archivedLeagues = leagues.filter(l => l.status === 'completed').sort(leagueDayTimeSort);

  // If the focused league is later archived or deleted, fall back to "See all"
  useEffect(() => {
    if (selectedLeagueFilter !== 'all' && !leagues.some(l => l.id === selectedLeagueFilter)) {
      setSelectedLeagueFilter('all');
    }
  }, [leagues, selectedLeagueFilter]);

  const openTeamFixtures = (team) => {
    const teamLeague = leagues.find(l => l.id === team.league_id);
    setTeamFixtures({ league: teamLeague, team });
  };

  // Club admin archives a league manually
  const handleArchiveLeague = async (league) => {
    await clubData('League', 'update', { id: league.id, data: { status: 'completed' } });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    toast.success(`${league.name} moved to archive`);
  };

  const handleRestoreLeague = async (league) => {
    await clubData('League', 'update', { id: league.id, data: { status: 'active' } });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    toast.success(`${league.name} restored to active leagues`);
  };

  // Helper for club data mutations
  const clubData = (entity, action, extra = {}) =>
    base44.functions.invoke('updateClubData', { entity, action, clubId, ...extra });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Batched booking cancellation - avoids rate limiting on large leagues
  const cancelBookingsInBatches = async (bookingIds) => {
    if (!bookingIds || bookingIds.length === 0) return;
    const CHUNK = 20;
    let done = 0;
    setBookingProgress({ phase: 'cancelling', done: 0, total: bookingIds.length });
    try {
      for (let i = 0; i < bookingIds.length; i += CHUNK) {
        const chunk = bookingIds.slice(i, i + CHUNK);
        await clubData('Booking', 'bulk_update', { ids: chunk, data: { status: 'cancelled' } });
        done += chunk.length;
        setBookingProgress({ phase: 'cancelling', done, total: bookingIds.length });
        if (i + CHUNK < bookingIds.length) {
          await sleep(600);
        }
      }
    } finally {
      setBookingProgress(null);
    }
  };

  // Batched fixture deletion - avoids rate limiting on large leagues
  const deleteFixturesInBatches = async (fixtureIds) => {
    if (!fixtureIds || fixtureIds.length === 0) return;
    const CHUNK = 25;
    let done = 0;
    setBookingProgress({ phase: 'deleting_fixtures', done: 0, total: fixtureIds.length });
    try {
      for (let i = 0; i < fixtureIds.length; i += CHUNK) {
        const chunk = fixtureIds.slice(i, i + CHUNK);
        await clubData('LeagueFixture', 'bulk_delete', { ids: chunk });
        done += chunk.length;
        setBookingProgress({ phase: 'deleting_fixtures', done, total: fixtureIds.length });
        if (i + CHUNK < fixtureIds.length) {
          await sleep(600);
        }
      }
    } finally {
      setBookingProgress(null);
    }
  };

  // League mutations (create / update / delete)
  const createLeagueMutation = useMutation({
    mutationFn: (data) => clubData('League', 'create', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League created');
      resetLeagueForm();
    },
  });

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }) => clubData('League', 'update', { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League updated');
      resetLeagueForm();
    },
  });

  // Deleting a league touches a lot of records (bookings, fixtures, teams), so it runs
  // in batches of 125 actions with a 60 second pause between batches to stay inside the
  // platform's rate limits. Progress and the pause countdown show in the overlay.
  const DELETE_BATCH = 125;
  const DELETE_COOLDOWN_SECONDS = 60;

  const deleteLeagueMutation = useMutation({
    mutationFn: async (id) => {
      // Find the league to get its name for booking lookup
      const leagueToDelete = leagues.find(l => l.id === id);
      const leagueFixturesList = await base44.entities.LeagueFixture.filter({ league_id: id });
      const linkedBookingIds = leagueFixturesList.map(f => f.booking_id).filter(Boolean);
      // Also cancel ALL bookings for this league by booker_name
      let namedBookingIds = [];
      if (leagueToDelete) {
        const leagueBookingsRes = await base44.functions.invoke('listBookingsForScheduling', {
          clubId,
          booker_name: `League - ${leagueToDelete.name}`
        });
        namedBookingIds = (leagueBookingsRes.data?.bookings || []).map(b => b.id);
      }
      const bookingIds = [...new Set([...linkedBookingIds, ...namedBookingIds])];
      const leagueTeamsList = await base44.entities.LeagueTeam.filter({ league_id: id });

      // One action per record — the league itself is deleted last
      const actions = [
        ...bookingIds.map(bid => ({ type: 'booking', id: bid })),
        ...leagueFixturesList.map(f => ({ type: 'fixture', id: f.id })),
        ...leagueTeamsList.map(t => ({ type: 'team', id: t.id })),
        { type: 'league', id },
      ];
      const total = actions.length;

      setDeleteProgress({ phase: 'deleting_league', done: 0, total, note: null });
      try {
        for (let i = 0; i < total; i += DELETE_BATCH) {
          const batch = actions.slice(i, i + DELETE_BATCH);
          const idsOf = type => batch.filter(a => a.type === type).map(a => a.id);

          const bookings = idsOf('booking');
          const fixtures = idsOf('fixture');
          const teams = idsOf('team');

          if (bookings.length > 0) {
            await clubData('Booking', 'bulk_update', { ids: bookings, data: { status: 'cancelled' } });
          }
          if (fixtures.length > 0) {
            await clubData('LeagueFixture', 'bulk_delete', { ids: fixtures });
          }
          for (const teamId of teams) {
            await clubData('LeagueTeam', 'delete', { id: teamId });
          }
          for (const leagueId of idsOf('league')) {
            await clubData('League', 'delete', { id: leagueId });
          }

          const done = Math.min(i + DELETE_BATCH, total);
          setDeleteProgress({ phase: 'deleting_league', done, total, note: null });

          // Pause before the next batch so the rate-limit window resets
          if (done < total) {
            for (let seconds = DELETE_COOLDOWN_SECONDS; seconds > 0; seconds--) {
              setDeleteProgress({
                phase: 'deleting_league',
                done,
                total,
                note: `Pausing ${seconds}s before the next ${Math.min(DELETE_BATCH, total - done)} records…`,
              });
              await sleep(1000);
            }
            setDeleteProgress({ phase: 'deleting_league', done, total, note: null });
          }
        }
      } finally {
        setDeleteProgress(null);
      }
    },
    onError: (error) => toast.error('Failed to delete league: ' + (error?.message || error)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['allLeagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('League deleted and associated bookings removed');
      setDeleteLeagueId(null);
    },
  });

  // Team mutations
  const createTeamMutation = useMutation({
    mutationFn: (data) => clubData('LeagueTeam', 'create', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team created');
      resetTeamForm();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => clubData('LeagueTeam', 'update', { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team updated');
      resetTeamForm();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id) => {
      // Remove every fixture referencing the deleted team (so regeneration,
      // tables and team views never show a blank entry for it)
      const [asHome, asAway] = await Promise.all([
        base44.entities.LeagueFixture.filter({ home_team_id: id }),
        base44.entities.LeagueFixture.filter({ away_team_id: id }),
      ]);
      const teamFixtures = [...asHome, ...asAway].filter(
        (f, i, arr) => arr.findIndex(x => x.id === f.id) === i
      );
      const linkedBookingIds = teamFixtures.map(f => f.booking_id).filter(Boolean);
      if (linkedBookingIds.length > 0) {
        await cancelBookingsInBatches(linkedBookingIds);
      }
      if (teamFixtures.length > 0) {
        await deleteFixturesInBatches(teamFixtures.map(f => f.id));
      }
      await clubData('LeagueTeam', 'delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Team deleted');
      setDeleteTeamId(null);
    },
  });

  const resetLeagueForm = () => {
    setLeagueDialogOpen(false);
    setEditingLeague(null);
    setLeagueName('');
    setLeagueDescription('');
    setLeagueStatus('draft');
    setLeagueCreationMode('auto');
    setLeagueStartDate('');
    setLeagueEndDate('');
    setLeagueStartTime('18:00');
    setLeagueEndTime('21:00');
    setLeagueFormat('fours');
    setLeagueGreenType(getPrimaryGreen(club));
    setLeagueIsSets(false);
    setLeagueIsDoubleRink(false);
    setLeagueSetsEnds(8);
    setLeagueForceEven(true);
    setLeagueRinks([]);
    setLeagueSessionTime('');
    setLeagueMultiSession(false);
    setLeagueSelectedSessions([]);
    setLeagueAdjacentRinks(false);
    setLeagueAdjacentPeriods([]);
    setScoringPointsPerSet(false);
    setScoringPointsPerSetValue(1);
    setScoringGameWin(false);
    setScoringGameWinValue(1);
    setScoringStandardWin(false);
    setScoringHighestShots(false);
  };

  const resetTeamForm = () => {
    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName('');
    setCaptainEmail('');
  };

  const handleEditLeague = (league) => {
    setEditingLeague(league);
    setLeagueName(league.name);
    setLeagueDescription(league.description || '');
    setLeagueStatus(league.status || 'draft');
    setLeagueStartDate(league.start_date || '');
    setLeagueEndDate(league.end_date || '');
    setLeagueStartTime(league.start_time || '18:00');
    setLeagueEndTime(league.end_time || '21:00');
    setLeagueFormat(league.format || 'fours');
    setLeagueGreenType(greenForLeague(club, league));
    setLeagueCreationMode(league.creation_mode || 'auto');
    setLeagueIsSets(league.is_sets || false);
    setLeagueIsDoubleRink(league.is_double_rink || false);
    setLeagueSetsEnds(league.sets_ends || 8);
    setLeagueForceEven(league.force_even_fixtures !== false);
    setLeagueRinks(league.league_rinks || []);
    setLeagueSessionTime(league.session_time || '');
    setLeagueMultiSession(league.multi_session || false);
    setLeagueSelectedSessions(league.selected_sessions || []);
    setLeagueAdjacentRinks(league.adjacent_rinks || false);
    setLeagueAdjacentPeriods(league.adjacent_rinks_periods || []);
    setScoringPointsPerSet(league.scoring_points_per_set || false);
    setScoringPointsPerSetValue(league.scoring_points_per_set_value ?? 1);
    setScoringGameWin(league.scoring_game_win || false);
    setScoringGameWinValue(league.scoring_game_win_value ?? 1);
    setScoringStandardWin(league.scoring_standard_win || false);
    setScoringHighestShots(league.scoring_highest_shots || false);
    setLeagueDialogOpen(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setSelectedLeague(leagues.find(l => l.id === team.league_id));
    setTeamName(team.name);
    setCaptainEmail(team.captain_email || '');
    setTeamDialogOpen(true);
  };

  const handleSaveLeague = () => {
    if (!leagueName.trim()) {
      toast.error('Please enter a league name');
      return;
    }
    if (leagueCreationMode === 'auto' && (!leagueStartTime || !leagueEndTime)) {
      toast.error('Please select a match session');
      return;
    }

    const data = {
      club_id: clubId,
      name: leagueName.trim(),
      creation_mode: leagueCreationMode,
      description: leagueDescription.trim(),
      status: leagueStatus,
      start_date: leagueStartDate || null,
      end_date: leagueEndDate || null,
      start_time: leagueStartTime || null,
      end_time: leagueEndTime || null,
      session_time: leagueSessionTime.trim() || null,
      format: leagueFormat,
      green_type: greenForLeague(club, { green_type: leagueGreenType }),
      is_sets: leagueIsSets,
      is_double_rink: leagueIsDoubleRink,
      sets_ends: leagueIsSets ? (parseInt(leagueSetsEnds) || 8) : null,
      force_even_fixtures: leagueForceEven,
      league_rinks: leagueRinks,
      multi_session: leagueMultiSession,
      selected_sessions: leagueMultiSession ? leagueSelectedSessions : [],
      adjacent_rinks: leagueAdjacentRinks,
      adjacent_rinks_periods: leagueAdjacentRinks ? leagueAdjacentPeriods : [],
      scoring_points_per_set: leagueIsSets ? scoringPointsPerSet : false,
      scoring_points_per_set_value: leagueIsSets && scoringPointsPerSet ? (parseFloat(scoringPointsPerSetValue) || 1) : null,
      scoring_game_win: leagueIsSets ? scoringGameWin : false,
      scoring_game_win_value: leagueIsSets && scoringGameWin ? (parseFloat(scoringGameWinValue) || 1) : null,
      scoring_standard_win: leagueIsSets ? scoringStandardWin : false,
      scoring_highest_shots: leagueIsSets ? scoringHighestShots : false,
    };

    if (editingLeague) {
      updateLeagueMutation.mutate({ id: editingLeague.id, data });
    } else {
      createLeagueMutation.mutate(data);
    }
  };

  const buildFixtureList = (league, leagueTeams, shuffleSeed = 0) =>
    buildFixturesForLeague(league, leagueTeams, rinkCountForGreen(club, greenForLeague(club, league)), shuffleSeed);

  const handleGenerateFixtures = async (league) => {
    const leagueTeams = teams.filter(t => t.league_id === league.id);

    if (leagueTeams.length < 2) {
      toast.error('Need at least 2 teams to generate fixtures');
      return;
    }
    if (!league.start_date || !league.end_date) {
      toast.error('Please set league start and end dates first');
      return;
    }

    setGeneratingFixtures(true);
    const allFixtures = buildFixtureList(league, leagueTeams);
    setGeneratingFixtures(false);

    // Show distribution preview modal
    setPendingFixtures(allFixtures);
    setPendingFixtureLeague(league);
    setPendingFixtureTeams(leagueTeams);
    setRegenerateCounter(0);
    setPendingIsRealloc(false);
    setDistributionModalOpen(true);
  };

  const handleConfirmFixtures = async () => {
    setGeneratingFixtures(true);
    try {
      if (pendingIsRealloc) {
        await confirmReallocFixtures();
      } else {
        const wasRegeneration = pendingIsRegeneration;
        const createdCount = pendingFixtures.length;
        const league = pendingFixtureLeague;
        const cleanFixtures = pendingFixtures.map(({ _nonAdjacent, ...f }) => f);
        const createdRes = await clubData('LeagueFixture', 'bulk_create', { data: cleanFixtures });
        const createdFixtures = createdRes?.data?.records || [];
        await clubData('League', 'update', { id: league.id, data: { fixtures_generated: true, status: 'active' } });
        queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
        queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
        setDistributionModalOpen(false);
        setPendingFixtures([]);
        setPendingFixtureLeague(null);
        setPendingFixtureTeams([]);
        setPendingIsRegeneration(false);
        if (wasRegeneration) {
          toast.success(`Regenerated ${createdCount} fixtures — now re-booking rinks`);
          await handleBookRinks(league, createdFixtures);
        } else {
          toast.success(`Generated ${createdCount} fixtures`);
        }
      }
    } finally {
      setGeneratingFixtures(false);
    }
  };

  // Accept in the distribution modal after a rink-allocation redraw: cancel the
  // existing rink bookings for this league, save the new rink numbers, then
  // re-book using the fresh allocations (all batched).
  const confirmReallocFixtures = async () => {
    const league = pendingFixtureLeague;
    try {
      const linkedBookingIds = (reallocSourceFixtures || []).map(f => f.booking_id).filter(Boolean);
      let namedBookingIds = [];
      try {
        const leagueBookingsRes = await base44.functions.invoke('listBookingsForScheduling', {
          clubId,
          booker_name: `League - ${league.name}`
        });
        namedBookingIds = (leagueBookingsRes.data?.bookings || []).map(b => b.id);
      } catch (_err) {
        // proceed with linked bookings only
      }
      const allBookingIds = [...new Set([...linkedBookingIds, ...namedBookingIds])];
      if (allBookingIds.length > 0) {
        await cancelBookingsInBatches(allBookingIds);
      }

      // Save the new rink numbers to the fixtures (batched)
      const updates = pendingFixtures
        .filter(f => f.id)
        .map(({ _nonAdjacent, ...f }) => ({ id: f.id, rink_number: f.rink_number }));
      const UPDATE_CHUNK = 100;
      setBookingProgress({ phase: 'updating', done: 0, total: updates.length });
      for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
        await base44.entities.LeagueFixture.bulkUpdate(updates.slice(i, i + UPDATE_CHUNK));
        setBookingProgress({ phase: 'updating', done: Math.min(i + UPDATE_CHUNK, updates.length), total: updates.length });
        if (i + UPDATE_CHUNK < updates.length) {
          await sleep(600);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setDistributionModalOpen(false);
      setPendingIsRealloc(false);
      setReallocSourceFixtures(null);
      toast.success(`New rink allocation saved — re-booking ${updates.length} fixture${updates.length !== 1 ? 's' : ''}`);

      // Re-book the rinks using the new allocations (clashes handled as normal)
      await handleBookRinks(league, pendingFixtures.map(({ _nonAdjacent, ...f }) => f));
    } finally {
      setBookingProgress(null);
    }
  };

  // Regenerate: cancel all previous bookings for this league, delete its fixtures,
  // then rebuild from the league's CURRENT settings (start/end dates, session times,
  // rinks, blacklisted dates) and re-book the rinks.
  const handleRegenerateLeague = async (league) => {
    if (!league) return;
    const leagueTeamsList = teams.filter(t => t.league_id === league.id);

    if (leagueTeamsList.length < 2) {
      toast.error('Need at least 2 teams to regenerate fixtures');
      setRegenDialogLeague(null);
      return;
    }
    if (!league.start_date || !league.end_date) {
      toast.error('Please set league start and end dates first');
      setRegenDialogLeague(null);
      return;
    }

    setRegeneratingFixtures(true);
    try {
      // 1. Cancel every rink booking associated with this league — both the
      //    bookings linked to fixtures and any made under the league's booker name
      const existingFixtures = await base44.entities.LeagueFixture.filter({ league_id: league.id });
      const linkedBookingIds = existingFixtures.map(f => f.booking_id).filter(Boolean);
      const leagueBookingsRes = await base44.functions.invoke('listBookingsForScheduling', {
        clubId,
        booker_name: `League - ${league.name}`
      });
      const namedBookingIds = (leagueBookingsRes.data?.bookings || []).map(b => b.id);
      const allBookingIds = [...new Set([...linkedBookingIds, ...namedBookingIds])];
      if (allBookingIds.length > 0) {
        await cancelBookingsInBatches(allBookingIds);
      }

      // 2. Delete the old fixtures (any scores already entered are lost)
      if (existingFixtures.length > 0) {
        await deleteFixturesInBatches(existingFixtures.map(f => f.id));
      }

      // 3. Reset the league flags so it can be re-booked
      await clubData('League', 'update', { id: league.id, data: { fixtures_generated: false, bookings_created: false } });
      queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      // 4. Build fresh fixtures from the current settings and show the preview
      const freshFixtures = buildFixtureList(league, leagueTeamsList);
      setPendingFixtures(freshFixtures);
      setPendingFixtureLeague(league);
      setPendingFixtureTeams(leagueTeamsList);
      setRegenerateCounter(0);
      setPendingIsRegeneration(true);
      setPendingIsRealloc(false);
      setDistributionModalOpen(true);
      setRegenDialogLeague(null);
      toast.success(`Cancelled ${allBookingIds.length} booking(s) — review the new fixtures below`);
    } catch (error) {
      console.error('Regenerate fixtures error:', error);
      toast.error('Failed to regenerate fixtures: ' + (error?.message || error));
      setRegenDialogLeague(null);
    }
    setRegeneratingFixtures(false);
  };

  const handleRegenerateFixtures = () => {
    // Use a random seed each time so each redraw produces a genuinely different distribution
    const nextSeed = Math.floor(Math.random() * 999983) + 1;
    setRegenerateCounter(nextSeed);
    const allFixtures = buildFixtureList(pendingFixtureLeague, pendingFixtureTeams, nextSeed);
    setPendingFixtures(allFixtures);
  };

  // "Regenerate Rink Allocations" — redraw rink numbers only (the fixtures
  // themselves are kept), then show the distribution modal so the admin can
  // keep redrawing until happy before accepting and re-booking.
  const handleReallocateRinks = (league) => {
    const leagueFixturesList = fixtures.filter(f => f.league_id === league.id);
    if (leagueFixturesList.length === 0) {
      toast.error('No fixtures to reallocate');
      return;
    }
    setReallocSourceFixtures(leagueFixturesList);
    setPendingFixtures(reassignRinkAllocations(league, leagueFixturesList, rinkCountForGreen(club, greenForLeague(club, league)), Math.floor(Math.random() * 999983) + 1));
    setPendingFixtureLeague(league);
    setPendingFixtureTeams(teams.filter(t => t.league_id === league.id));
    setPendingIsRegeneration(false);
    setPendingIsRealloc(true);
    setDistributionModalOpen(true);
  };

  // Regenerate button inside the modal during a rink-allocation redraw
  const handleRegenerateAllocations = () => {
    const nextSeed = Math.floor(Math.random() * 999983) + 1;
    setPendingFixtures(reassignRinkAllocations(pendingFixtureLeague, reallocSourceFixtures, rinkCountForGreen(club, greenForLeague(club, pendingFixtureLeague)), nextSeed));
  };

  const handleBookRinks = async (league, fixtureListOverride) => {
    // Always process from the earliest (first) fixture date onwards, so
    // bookings are created from the league start date regardless of how the
    // fixtures happen to be ordered in the query results.
    const leagueFixtures = (fixtureListOverride || fixtures.filter(f => f.league_id === league.id))
      .slice().sort((a, b) => String(a.match_date).localeCompare(String(b.match_date)));
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    
    if (leagueFixtures.length === 0) {
      toast.error('No fixtures to book');
      return;
    }
    
    setBookingRinks(true);

    // Fetch all existing bookings for the dates involved
    const uniqueDates = [...new Set(leagueFixtures.map(f => f.match_date))];
    const schedulingRes = await base44.functions.invoke('listBookingsForScheduling', { clubId, dates: uniqueDates });
    let allExistingBookings = schedulingRes.data.bookings || [];

    // The green this league is played on — indoor and outdoor rinks are independent
    const green = greenForLeague(club, league);
    const greenConfig = getRinkConfig(club, green);
    const rinkCount = greenConfig.rink_count || 6;
    const allRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

    // For custom sessions: expand each fixture into multiple bookings (one per session in range)
    const leagueStartTime = league.start_time || '18:00';
    const leagueEndTime = league.end_time || '21:00';

    const getSessionSlots = () => {
      // If multi-session is enabled and sessions are selected, use those directly
      if (league.multi_session && league.selected_sessions && league.selected_sessions.length > 0) {
        return league.selected_sessions.map(s => ({ start_time: s.start, end_time: s.end }));
      }
      if (greenConfig.use_custom_sessions && greenConfig.custom_sessions?.length > 0) {
        const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const startMins = timeToMins(leagueStartTime);
        const endMins = timeToMins(leagueEndTime);
        return greenConfig.custom_sessions.filter(s => timeToMins(s.start) >= startMins && timeToMins(s.end) <= endMins)
          .map(s => ({ start_time: s.start, end_time: s.end }));
      }
      return [{ start_time: leagueStartTime, end_time: leagueEndTime }];
    };

    const sessionSlots = getSessionSlots();

    const proposedBookings = leagueFixtures.flatMap(fixture => {
      const notesText = `${leagueTeams.find(t => t.id === fixture.home_team_id)?.name} vs ${leagueTeams.find(t => t.id === fixture.away_team_id)?.name}`;
      return sessionSlots.map((slot, slotIdx) => ({
        club_id: clubId,
        rink_number: fixture.rink_number,
        date: fixture.match_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'approved',
        competition_type: 'Club',
        green_type: green,
        booker_name: `League - ${league.name}`,
        booker_email: user.email,
        notes: notesText,
        _fixtureId: slotIdx === 0 ? fixture.id : null, // only link first slot to fixture
      }));
    });

    const clashes = [];
    const nonClashingBookings = [];
    const alreadyBookedLinks = []; // fixtures whose rink was booked on a previous run

    for (const proposed of proposedBookings) {
      // Already booked by an earlier run of this same league booking? Skip it
      // quietly (and repair the fixture link) instead of raising a clash —
      // this keeps "Book Rinks" idempotent so re-running it fills any gaps.
      const ownBooking = allExistingBookings.find(
        b => b.booker_name === proposed.booker_name &&
             b.status === 'approved' &&
             b.rink_number === proposed.rink_number &&
             b.date === proposed.date &&
             b.start_time === proposed.start_time &&
             getBookingGreen(b, club) === green
      );
      if (ownBooking) {
        if (proposed._fixtureId) {
          alreadyBookedLinks.push({ id: proposed._fixtureId, booking_id: ownBooking.id });
        }
        continue;
      }

      const existingBooking = allExistingBookings.find(
        b => b.rink_number === proposed.rink_number &&
             b.date === proposed.date &&
             b.start_time === proposed.start_time &&
             getBookingGreen(b, club) === green &&
             b.status !== 'cancelled' &&
             b.status !== 'rejected'
      );

      if (existingBooking) {
        // Find free rink (not taken by existing bookings or other proposed bookings at same time/date)
        const usedRinks = new Set([
          ...allExistingBookings
            .filter(b => b.date === proposed.date && b.start_time === proposed.start_time && getBookingGreen(b, club) === green && b.status !== 'cancelled' && b.status !== 'rejected')
            .map(b => b.rink_number),
          ...proposedBookings
            .filter(p => p.date === proposed.date && p.start_time === proposed.start_time && p !== proposed)
            .map(p => p.rink_number),
        ]);
        const suggestedRink = allRinks.find(r => !usedRinks.has(r)) || null;
        clashes.push({ proposedBooking: proposed, existingBooking, suggestedRink });
      } else {
        nonClashingBookings.push(proposed);
      }
    }

    setBookingRinks(false);

    if (clashes.length === 0) {
      await doCreateLeagueBookings(nonClashingBookings, leagueFixtures, league, alreadyBookedLinks);
    } else {
      setClashData({ clashes, nonClashingBookings, league, leagueFixturesForBooking: leagueFixtures, allExistingBookings, alreadyBookedLinks });
      setClashModalOpen(true);
    }
  };

  const doCreateLeagueBookings = async (bookingsToCreate, leagueFixtures, league, alreadyBookedLinks = []) => {
    if (bookingsToCreate.length === 0 && alreadyBookedLinks.length === 0) {
      toast.info('All fixtures already booked — nothing to do');
      return;
    }
    try {
      // Create bookings in batches so large leagues avoid rate limits, and
      // retry each chunk so a one-off rate-limit blip can't silently drop
      // bookings from the middle of the schedule.
      const CHUNK = 40;
      const createdBookings = [];
      // Fixture links include fixtures whose rink was already booked on a
      // previous run, plus the first booking of each newly created fixture
      const links = [...alreadyBookedLinks];
      const totalSlots = bookingsToCreate.length + alreadyBookedLinks.length;
      setBookingProgress({ phase: 'creating', done: 0, total: totalSlots });
      for (let i = 0; i < bookingsToCreate.length; i += CHUNK) {
        const chunkOriginals = bookingsToCreate.slice(i, i + CHUNK);
        const chunk = chunkOriginals.map(({ _fixtureId, ...b }) => b);
        let createdRes = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            createdRes = await base44.functions.invoke('updateClubData', { entity: 'Booking', action: 'bulk_create', clubId, data: chunk });
            break;
          } catch (err) {
            if (attempt === 2) throw err;
            await sleep(2000 * (attempt + 1));
          }
        }
        const records = createdRes?.data?.records || [];
        // Match fixture links chunk-locally so a partial chunk can't
        // mis-align links to the wrong fixture
        chunkOriginals.forEach((orig, j) => {
          if (orig._fixtureId && records[j]?.id) {
            links.push({ id: orig._fixtureId, booking_id: records[j].id });
          }
        });
        createdBookings.push(...records);
        setBookingProgress({ phase: 'creating', done: Math.min(i + CHUNK, bookingsToCreate.length) + alreadyBookedLinks.length, total: totalSlots });
        if (i + CHUNK < bookingsToCreate.length) {
          await sleep(600);
        }
      }

      // Link the first booking of each fixture back to the fixture (batched)
      const LINK_CHUNK = 100;
      if (links.length > 0) {
        setBookingProgress({ phase: 'linking', done: 0, total: links.length });
        for (let i = 0; i < links.length; i += LINK_CHUNK) {
          await base44.entities.LeagueFixture.bulkUpdate(links.slice(i, i + LINK_CHUNK));
          setBookingProgress({ phase: 'linking', done: Math.min(i + LINK_CHUNK, links.length), total: links.length });
          if (i + LINK_CHUNK < links.length) {
            await sleep(600);
          }
        }
      }

      await clubData('League', 'update', { id: league.id, data: { bookings_created: true } });
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    const totalDone = createdBookings.length + alreadyBookedLinks.length;
    toast.success(`Rinks booked from the first fixture. ${createdBookings.length} new booking${createdBookings.length !== 1 ? 's' : ''} created${alreadyBookedLinks.length ? `, ${alreadyBookedLinks.length} already in place from a previous run` : ''} covering ${totalDone} fixture${totalDone !== 1 ? 's' : ''}.`);
    } finally {
      setBookingProgress(null);
    }
  };

  const handleLeagueClashProceed = async (bookingsToCreate) => {
    const { league, leagueFixturesForBooking, alreadyBookedLinks } = clashData;
    await doCreateLeagueBookings(bookingsToCreate, leagueFixturesForBooking, league, alreadyBookedLinks || []);
    setClashModalOpen(false);
  };

  const viewFixtures = (league) => {
    setViewingLeague(league);
    setFixturesTeamFilter('all');
    setFixturesDialogOpen(true);
  };

  const openScoreDialog = (fixture) => {
    setEditingFixture(fixture);
    setHomeScore(fixture.home_score?.toString() || '');
    setAwayScore(fixture.away_score?.toString() || '');
    setHomeSets(fixture.home_sets?.toString() || '');
    setAwaySets(fixture.away_sets?.toString() || '');
    setHadTiebreak(fixture.had_tiebreak === true);
    setTiebreakWinner(fixture.tiebreak_winner || null);
    setScoreDialogOpen(true);
  };

  const handleSaveScore = async () => {
    if (homeScore === '' || awayScore === '') {
      toast.error('Please enter both scores');
      return;
    }
    const scoringLeague = viewingLeague || leagues.find(l => l.id === editingFixture?.league_id);
    const isSetsLeague = scoringLeague?.is_sets;
    if (isSetsLeague && (homeSets === '' || awaySets === '')) {
      toast.error('Please enter both set counts');
      return;
    }
    if (isSetsLeague) {
      const hsS = parseSetsValue(homeSets);
      const asS = parseSetsValue(awaySets);
      if (isNaN(hsS) || isNaN(asS)) {
        toast.error('Sets must be in 0.5 steps (e.g. 2.5 — enter 0.5 for each drawn set)');
        return;
      }
      const setsLevel = hsS === asS;
      if (!hadTiebreak && setsLevel) {
        toast.error('Sets are level – switch on Tiebreak and choose the winner');
        return;
      }
      if (hadTiebreak && !setsLevel) {
        toast.error('A tiebreak is only played when sets are level');
        return;
      }
      if (hadTiebreak && !tiebreakWinner) {
        toast.error('Please choose the tiebreak winner');
        return;
      }
    }
    
    const updateData = {
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      status: 'completed',
    };
    if (isSetsLeague) {
      updateData.home_sets = parseSetsValue(homeSets);
      updateData.away_sets = parseSetsValue(awaySets);
      updateData.had_tiebreak = hadTiebreak;
      updateData.tiebreak_winner = hadTiebreak ? tiebreakWinner : null;
    }

    await clubData('LeagueFixture', 'update', { id: editingFixture.id, data: updateData });
    
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    setScoreDialogOpen(false);
    setEditingFixture(null);
    toast.success('Score saved');
  };

  const viewLeagueTable = (league) => {
    setViewingTableLeague(league);
    setTableDialogOpen(true);
  };

  const openScoresModal = (league) => {
    setScoresModalLeague(league);
    setScoresModalOpen(true);
  };

  const openScorecardDialog = (league) => {
    setScorecardDialogLeague(league);
    setScorecardMatchDate('');
  };

  const handlePrintScorecards = async (league, matchDate) => {
    try {
      const dateFilter = (matchDate && typeof matchDate === 'string' && matchDate.length > 0) ? matchDate : null;
      if (club?.scorecard_format === 'xlsx') {
        toast.info('Generating CSV scorecards...');
        const result = await base44.functions.invoke('generateLeagueScorecardsXlsx', { leagueId: league.id, clubId, matchDate: dateFilter });
        const csv = result?.data?.csv;
        const filename = result?.data?.filename || `${league.name}-scorecards.csv`;
        if (!csv) { toast.error('No CSV data returned'); return; }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV scorecards downloaded');
      } else {
        toast.info('Generating scorecards...');
        const result = await base44.functions.invoke('generateLeagueScorecards', { leagueId: league.id, clubId, matchDate: dateFilter });
        const html = result?.data?.html;
        if (!html) { toast.error('No scorecard data returned'); return; }
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
        } else {
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${league.name}-scorecards.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setScorecardDialogLeague(null);
        toast.success('Scorecards ready — use Print > Save as PDF');
      }
    } catch (error) {
      console.error('Scorecard error:', error);
      toast.error('Failed to generate scorecards: ' + (error?.message || error));
    }
  };

  const handleSaveTeam = (players) => {
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    if (!selectedLeague) {
      toast.error('Please select a league');
      return;
    }

    const captain = members.find(m => m.user_email === captainEmail);
    const captainName = captain 
      ? (captain.first_name && captain.surname ? `${captain.first_name} ${captain.surname}` : captain.user_name || captain.user_email)
      : '';

    // Add captain as default player if not editing
    const initialPlayers = captainEmail && !editingTeam ? [captainEmail] : undefined;

    const data = {
      league_id: selectedLeague.id,
      club_id: clubId,
      name: teamName.trim(),
      captain_email: captainEmail || null,
      captain_name: captainName || null,
      ...(initialPlayers && { players: initialPlayers }),
    };

    const playersToSync = editingTeam ? (players ?? []) : (initialPlayers || []);
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data: { ...data, players: players ?? [] } });
    } else {
      createTeamMutation.mutate(data);
    }
    // Prepopulate My Teams unavailability from each player's My Profile unavailability
    playersToSync.forEach(email => {
      if (email) base44.functions.invoke('syncPlayerUnavailability', { user_email: email, notify: false }).catch(() => {});
    });
  };

  const openAddTeam = (league) => {
    setSelectedLeague(league);
    setTeamDialogOpen(true);
  };

  if (!clubId) return null;

  if (user && !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need club admin privileges to manage leagues.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  // Fixture row used by the overdue and upcoming lists in the single-league view
  const renderFixtureRow = (league, fixture, showPending) => {
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
          {league?.is_double_rink && fixture.tie_id && (
            <Badge variant="outline" className="bg-blue-50 text-blue-600">Leg {fixture.leg || 1}</Badge>
          )}
          {showPending && fixture.pending_home_score != null && (
            <Badge className="bg-amber-100 text-amber-800">Score pending approval</Badge>
          )}
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
  };

  // The standard League card, shared by the "See all" list and the single-league view
  const renderLeagueCard = (league, leagueTeams, teamsDefaultOpen = false) => (
    <motion.div
      key={league.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  {league.name}
                  <Badge className={statusColors[league.status || 'draft']}>
                    {league.status || 'draft'}
                  </Badge>
                  {league.format && (
                    <Badge variant="outline">
                      {league.format === 'triples' ? 'Triples' : 'Fours'}
                    </Badge>
                  )}
                  {league.creation_mode === 'manual' && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">Manual</Badge>
                  )}
                  {league.is_double_rink && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Double Rink</Badge>
                  )}
                </CardTitle>
                {league.description && (
                  <CardDescription>{league.description}</CardDescription>
                )}
                {league.start_date && league.end_date && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(league.start_date), 'd MMM')} - {format(parseISO(league.end_date), 'd MMM yyyy')}
                    </span>
                    {league.start_time && league.end_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {league.start_time} - {league.end_time}
                      </span>
                    )}
                  </div>
                )}
                {(league.blacklisted_dates || []).length > 0 && (
                  <div className="flex items-start gap-1.5 mt-1 text-sm text-red-600">
                    <CalendarX className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      No fixtures on:{' '}
                      {league.blacklisted_dates
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map(d => format(parseISO(d.date), 'd MMM yyyy'))
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Manage menu: setup tools and league admin actions */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Settings className="w-4 h-4 mr-1" />
                  Manage
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs font-normal text-gray-500">Fixtures</DropdownMenuLabel>
                {league.creation_mode !== 'manual' && league.fixtures_generated && (
                  <DropdownMenuItem
                    disabled={regeneratingFixtures}
                    onSelect={() => setRegenDialogLeague(league)}
                    title="Delete existing fixtures and bookings, then rebuild from current league settings"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate fixtures
                  </DropdownMenuItem>
                )}
                {league.fixtures_generated && (
                  <DropdownMenuItem
                    disabled={regeneratingFixtures}
                    onSelect={() => handleReallocateRinks(league)}
                    title="Redraw rink allocations without changing fixtures"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Re-allocate rinks
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => {
                    setBlacklistLeague(league);
                    setBlacklistDialogOpen(true);
                  }}
                >
                  <CalendarX className="w-4 h-4 mr-2" />
                  Blacklist dates
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-gray-500">League</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => handleEditLeague(league)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit league
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setArchiveLeagueId(league.id)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive league
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onSelect={() => setDeleteLeagueId(league.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete league
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Everyday actions: always visible and labelled */}
          <div className="flex gap-2 flex-wrap mt-4 empty:hidden">
            {/* Manual mode: always show Edit Fixtures button */}
            {league.creation_mode === 'manual' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setManualFixturesLeague(league); setManualFixturesModalOpen(true); }}
                className="text-purple-600 hover:bg-purple-50 border-purple-200"
              >
                <List className="w-4 h-4 mr-1" />
                {league.fixtures_generated ? 'Edit Fixtures' : 'Add Fixtures'}
              </Button>
            )}
            {/* Auto mode: show Generate Fixtures when conditions met */}
            {league.creation_mode !== 'manual' && !league.fixtures_generated && leagueTeams.length >= 2 && league.start_date && league.end_date && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateFixtures(league)}
                disabled={generatingFixtures}
                className="text-emerald-600 hover:bg-emerald-50"
              >
                {generatingFixtures ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-1" />
                )}
                Generate Fixtures
              </Button>
            )}
            {league.fixtures_generated && !league.bookings_created && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBookRinks(league)}
                disabled={bookingRinks}
                className="text-blue-600 hover:bg-blue-50"
              >
                {bookingRinks ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CalendarCheck className="w-4 h-4 mr-1" />
                )}
                Book Rinks
              </Button>
            )}
            {league.fixtures_generated && (
              <>
                <Button variant="outline" size="sm" onClick={() => openScoresModal(league)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Enter scores
                </Button>
                <Button variant="outline" size="sm" onClick={() => viewFixtures(league)}>
                  <List className="w-4 h-4 mr-1" />
                  Fixtures
                </Button>
                <Button variant="outline" size="sm" onClick={() => viewLeagueTable(league)}>
                  <BarChart3 className="w-4 h-4 mr-1" />
                  League table
                </Button>
                <Button variant="outline" size="sm" onClick={() => openScorecardDialog(league)}>
                  <Printer className="w-4 h-4 mr-1" />
                  Print scorecards
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <LeagueTeamsSection
            leagueTeams={leagueTeams}
            defaultOpen={teamsDefaultOpen}
            onAddTeam={() => openAddTeam(league)}
            onViewFixtures={openTeamFixtures}
            onEditTeam={handleEditTeam}
            onDeleteTeam={(id) => setDeleteTeamId(id)}
          />
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">League Management</h1>
              <p className="text-gray-600">{club?.name} • Manage leagues and teams</p>
            </div>
            <Button 
              onClick={() => setLeagueDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New League
            </Button>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={!showArchive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchive(false)}
          >
            Active Leagues ({activeLeagues.length})
          </Button>
          <Button
            variant={showArchive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchive(true)}
          >
            Archive ({archivedLeagues.length})
          </Button>
        </div>

        {!showArchive && <GreenFilter club={club} value={leagueGreenFilter} onChange={setLeagueGreenFilter} className="mb-4" />}

        {!showArchive && activeLeagues.length > 0 && (
          <div className="mb-6 -mt-3">
            <LeagueSearchSelect
              leagues={activeLeagues}
              value={selectedLeagueFilter}
              onValueChange={(id) => {
                setSelectedLeagueFilter(id || 'all');
                setShowAllUpcoming(false);
              }}
            />
          </div>
        )}

        {leaguesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : showArchive ? (
          <LeagueArchiveSection
            leagues={archivedLeagues}
            onViewTable={viewLeagueTable}
            onRestore={handleRestoreLeague}
            onDelete={(id) => setDeleteLeagueId(id)}
          />
        ) : activeLeagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues yet</h3>
              <p className="text-gray-500 mb-4">Create your first league to get started</p>
              <Button onClick={() => setLeagueDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create League
              </Button>
            </CardContent>
          </Card>
        ) : selectedLeagueFilter !== 'all' ? (
          (() => {
            const focusLeague = activeLeagues.find(l => l.id === selectedLeagueFilter);
            if (!focusLeague) return null;
            const focusTeams = teams.filter(t => t.league_id === focusLeague.id);
            return (
              <div className="space-y-6">
                {renderLeagueCard(focusLeague, focusTeams, false)}
                <LeagueFocusView
                  league={focusLeague}
                  teams={teams}
                  fixtures={fixtures}
                  onScoreEdit={openScoreDialog}
                />
              </div>
            );
          })()
        ) : club?.alt_view_leagues ? (
          <LeagueAdminTableView
            leagues={activeLeagues}
            teams={teams}
            fixtures={fixtures}
            club={club}
            members={members}
            onEditLeague={handleEditLeague}
            onDeleteLeague={(id) => setDeleteLeagueId(id)}
            onAddTeam={openAddTeam}
            onEditTeam={handleEditTeam}
            onDeleteTeam={(id) => setDeleteTeamId(id)}
            onGenerateFixtures={handleGenerateFixtures}
            onBookRinks={handleBookRinks}
            onViewFixtures={viewFixtures}
            onViewTable={viewLeagueTable}
            onOpenScores={openScoresModal}
            onBlacklist={(league) => { setBlacklistLeague(league); setBlacklistDialogOpen(true); }}
            generatingFixtures={generatingFixtures}
            bookingRinks={bookingRinks}
            onGenerateScorecards={(league) => openScorecardDialog(league)}
            onArchiveLeague={(league) => setArchiveLeagueId(league.id)}
            onRegenerateFixtures={(league) => setRegenDialogLeague(league)}
            regeneratingFixtures={regeneratingFixtures}
            onViewTeamFixtures={openTeamFixtures}
            onReallocateRinks={handleReallocateRinks}
          />
        ) : (
          <div className="space-y-6">
            {activeLeagues.map((league) => {
              const leagueTeams = teams.filter(t => t.league_id === league.id);
              return renderLeagueCard(league, leagueTeams);
            })}
          </div>
        )}

        {/* League Dialog */}
        <LeagueFormDialog
          open={leagueDialogOpen}
          onCancel={resetLeagueForm}
          editingLeague={editingLeague}
          club={club}
          onSave={handleSaveLeague}
          isSaving={createLeagueMutation.isPending || updateLeagueMutation.isPending}
          leagueName={leagueName} setLeagueName={setLeagueName}
          leagueDescription={leagueDescription} setLeagueDescription={setLeagueDescription}
          leagueStartDate={leagueStartDate} setLeagueStartDate={setLeagueStartDate}
          leagueEndDate={leagueEndDate} setLeagueEndDate={setLeagueEndDate}
          leagueCreationMode={leagueCreationMode} setLeagueCreationMode={setLeagueCreationMode}
          leagueMultiSession={leagueMultiSession} setLeagueMultiSession={setLeagueMultiSession}
          leagueSelectedSessions={leagueSelectedSessions} setLeagueSelectedSessions={setLeagueSelectedSessions}
          leagueStartTime={leagueStartTime} setLeagueStartTime={setLeagueStartTime}
          leagueEndTime={leagueEndTime} setLeagueEndTime={setLeagueEndTime}
          leagueFormat={leagueFormat} setLeagueFormat={setLeagueFormat}
          leagueSessionTime={leagueSessionTime} setLeagueSessionTime={setLeagueSessionTime}
          leagueAdjacentRinks={leagueAdjacentRinks} setLeagueAdjacentRinks={setLeagueAdjacentRinks}
          leagueAdjacentPeriods={leagueAdjacentPeriods} setLeagueAdjacentPeriods={setLeagueAdjacentPeriods}
          leagueGreenType={leagueGreenType} setLeagueGreenType={setLeagueGreenType}
          leagueRinks={leagueRinks} setLeagueRinks={setLeagueRinks}
          leagueForceEven={leagueForceEven} setLeagueForceEven={setLeagueForceEven}
          leagueIsDoubleRink={leagueIsDoubleRink} setLeagueIsDoubleRink={setLeagueIsDoubleRink}
          leagueIsSets={leagueIsSets} setLeagueIsSets={setLeagueIsSets}
          leagueSetsEnds={leagueSetsEnds} setLeagueSetsEnds={setLeagueSetsEnds}
          scoringPointsPerSet={scoringPointsPerSet} setScoringPointsPerSet={setScoringPointsPerSet}
          scoringPointsPerSetValue={scoringPointsPerSetValue} setScoringPointsPerSetValue={setScoringPointsPerSetValue}
          scoringGameWin={scoringGameWin} setScoringGameWin={setScoringGameWin}
          scoringGameWinValue={scoringGameWinValue} setScoringGameWinValue={setScoringGameWinValue}
          scoringStandardWin={scoringStandardWin} setScoringStandardWin={setScoringStandardWin}
          scoringHighestShots={scoringHighestShots} setScoringHighestShots={setScoringHighestShots}
        />

        {/* Team Dialog */}
        <TeamDialog
          open={teamDialogOpen}
          onClose={resetTeamForm}
          editingTeam={editingTeam}
          selectedLeague={selectedLeague}
          teams={teams}
          members={members}
          club={club}
          teamName={teamName}
          setTeamName={setTeamName}
          captainEmail={captainEmail}
          setCaptainEmail={setCaptainEmail}
          onSave={handleSaveTeam}
          isSaving={createTeamMutation.isPending || updateTeamMutation.isPending}
        />

        {/* Delete League Confirmation */}
        <AlertDialog open={!!deleteLeagueId} onOpenChange={() => setDeleteLeagueId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete League?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this league and all its teams, fixtures and rink bookings. Large leagues are removed in batches of 125 records with a short pause between each batch, so this can take a few minutes — keep this page open until it finishes. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const leagueIdToDelete = deleteLeagueId;
                  setDeleteLeagueId(null);
                  deleteLeagueMutation.mutate(leagueIdToDelete);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Regenerate Fixtures Confirmation */}
        <AlertDialog open={!!regenDialogLeague} onOpenChange={() => setRegenDialogLeague(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate fixtures for {regenDialogLeague?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all existing fixtures for this league — including any scores already entered — and cancel every rink booking made for it. New fixtures will be rebuilt from the league's current settings (start/end dates, session times, rinks and blacklisted dates), then the rinks will be re-booked. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleRegenerateLeague(regenDialogLeague)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {regeneratingFixtures && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Regenerate Fixtures
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Archive League Confirmation */}
        <AlertDialog open={!!archiveLeagueId} onOpenChange={() => setArchiveLeagueId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this league?</AlertDialogTitle>
              <AlertDialogDescription>
                {leagues.find(l => l.id === archiveLeagueId)?.name} will be moved to the Archive section. Nothing is deleted — its teams, fixtures, scores and bookings are kept, and you can restore it from the Archive at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const leagueToArchive = leagues.find(l => l.id === archiveLeagueId);
                  setArchiveLeagueId(null);
                  if (leagueToArchive) handleArchiveLeague(leagueToArchive);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Yes, Archive League
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Team Confirmation */}
        <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this team and remove any of its fixtures (and their rink bookings) from the league. If fixtures have already been generated, regenerate them afterwards to rebalance the schedule. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTeamMutation.mutate(deleteTeamId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batched booking / cleanup progress overlay */}
        <BookingProgressOverlay progress={bookingProgress} />

        {/* Batched league deletion progress overlay */}
        <BookingProgressOverlay progress={deleteProgress} />

        {/* Fixtures, scores, scorecards and scheduling dialogs */}
        <LeagueAdminDialogs
          club={club}
          clubId={clubId}
          leagues={leagues}
          teams={teams}
          fixtures={fixtures}
          fixturesDialogOpen={fixturesDialogOpen}
          setFixturesDialogOpen={setFixturesDialogOpen}
          viewingLeague={viewingLeague}
          fixturesTeamFilter={fixturesTeamFilter}
          setFixturesTeamFilter={setFixturesTeamFilter}
          openScoreDialog={openScoreDialog}
          scoreDialogOpen={scoreDialogOpen}
          setScoreDialogOpen={setScoreDialogOpen}
          editingFixture={editingFixture}
          homeScore={homeScore} setHomeScore={setHomeScore}
          awayScore={awayScore} setAwayScore={setAwayScore}
          homeSets={homeSets} setHomeSets={setHomeSets}
          awaySets={awaySets} setAwaySets={setAwaySets}
          hadTiebreak={hadTiebreak} setHadTiebreak={setHadTiebreak}
          tiebreakWinner={tiebreakWinner} setTiebreakWinner={setTiebreakWinner}
          handleSaveScore={handleSaveScore}
          scoresModalOpen={scoresModalOpen}
          setScoresModalOpen={setScoresModalOpen}
          scoresModalLeague={scoresModalLeague}
          distributionModalOpen={distributionModalOpen}
          setDistributionModalOpen={setDistributionModalOpen}
          pendingFixtures={pendingFixtures}
          pendingFixtureTeams={pendingFixtureTeams}
          pendingFixtureLeague={pendingFixtureLeague}
          pendingIsRealloc={pendingIsRealloc}
          handleRegenerateAllocations={handleRegenerateAllocations}
          handleRegenerateFixtures={handleRegenerateFixtures}
          handleConfirmFixtures={handleConfirmFixtures}
          generatingFixtures={generatingFixtures}
          blacklistDialogOpen={blacklistDialogOpen}
          setBlacklistDialogOpen={setBlacklistDialogOpen}
          blacklistLeague={blacklistLeague}
          clashModalOpen={clashModalOpen}
          setClashModalOpen={setClashModalOpen}
          clashData={clashData}
          handleLeagueClashProceed={handleLeagueClashProceed}
          bookingRinks={bookingRinks}
          teamFixtures={teamFixtures}
          setTeamFixtures={setTeamFixtures}
          tableDialogOpen={tableDialogOpen}
          setTableDialogOpen={setTableDialogOpen}
          viewingTableLeague={viewingTableLeague}
          scorecardDialogLeague={scorecardDialogLeague}
          setScorecardDialogLeague={setScorecardDialogLeague}
          scorecardMatchDate={scorecardMatchDate}
          setScorecardMatchDate={setScorecardMatchDate}
          handlePrintScorecards={handlePrintScorecards}
          manualFixturesModalOpen={manualFixturesModalOpen}
          setManualFixturesModalOpen={setManualFixturesModalOpen}
          manualFixturesLeague={manualFixturesLeague}
          onManualFixturesClose={(didSave) => {
            setManualFixturesModalOpen(false);
            if (didSave) {
              queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
              queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
            }
          }}
        />
      </div>
    </div>
  );
}