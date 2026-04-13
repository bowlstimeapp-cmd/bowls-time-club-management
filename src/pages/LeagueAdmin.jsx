import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trophy, 
  Users, 
  Loader2, 
  ShieldAlert,
  Pencil,
  Trash2,
  UserCircle,
  Calendar,
  Clock,
  Zap,
  List,
  CalendarCheck,
  BarChart3,
  Printer,
  CalendarX
} from 'lucide-react';
import BlacklistDatesDialog from '@/components/leagues/BlacklistDatesDialog';
import MemberSearchSelect from '@/components/member/MemberSearchSelect';
import { calculateLeagueTable, getScoringRules } from '@/lib/leagueScoring';
import RinkDistributionModal from '@/components/leagues/RinkDistributionModal';
import RinkClashModal from '@/components/booking/RinkClashModal';
import LeagueAdminTableView from '@/components/leagues/LeagueAdminTableView';
import LeagueScoresModal from '@/components/leagues/LeagueScoresModal';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, addDays, eachWeekOfInterval, isBefore } from 'date-fns';

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
  const [leagueIsSets, setLeagueIsSets] = useState(false);
  const [leagueSetsEnds, setLeagueSetsEnds] = useState(8);
  const [leagueForceEven, setLeagueForceEven] = useState(true);
  const [leagueRinks, setLeagueRinks] = useState([]);
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

  const [teamName, setTeamName] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');

  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [fixturesDialogOpen, setFixturesDialogOpen] = useState(false);
  const [viewingLeague, setViewingLeague] = useState(null);
  const [bookingRinks, setBookingRinks] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [homeSets, setHomeSets] = useState('');
  const [awaySets, setAwaySets] = useState('');
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [viewingTableLeague, setViewingTableLeague] = useState(null);
  const [scoresModalOpen, setScoresModalOpen] = useState(false);
  const [scoresModalLeague, setScoresModalLeague] = useState(null);
  const tableRef = useRef();
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [blacklistLeague, setBlacklistLeague] = useState(null);
  const [clashModalOpen, setClashModalOpen] = useState(false);
  const [clashData, setClashData] = useState({ clashes: [], nonClashingBookings: [], league: null, leagueFixturesForBooking: [], allExistingBookings: [] });

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

  // League mutations
  const createLeagueMutation = useMutation({
    mutationFn: (data) => base44.entities.League.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League created');
      resetLeagueForm();
    },
  });

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League updated');
      resetLeagueForm();
    },
  });

  const deleteLeagueMutation = useMutation({
    mutationFn: async (id) => {
      // Delete associated fixtures and their bookings
      const leagueFixturesList = await base44.entities.LeagueFixture.filter({ league_id: id });
      // Cancel bookings linked to this league's fixtures
      const bookingIds = leagueFixturesList.map(f => f.booking_id).filter(Boolean);
      await Promise.all(bookingIds.map(bid => base44.entities.Booking.update(bid, { status: 'cancelled' })));
      // Delete fixtures
      await Promise.all(leagueFixturesList.map(f => base44.entities.LeagueFixture.delete(f.id)));
      // Delete teams
      const leagueTeamsList = await base44.entities.LeagueTeam.filter({ league_id: id });
      await Promise.all(leagueTeamsList.map(t => base44.entities.LeagueTeam.delete(t.id)));
      // Delete league
      await base44.entities.League.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('League deleted and associated bookings removed');
      setDeleteLeagueId(null);
    },
  });

  // Team mutations
  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.LeagueTeam.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team created');
      resetTeamForm();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeagueTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team updated');
      resetTeamForm();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => base44.entities.LeagueTeam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
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
    setLeagueStartDate('');
    setLeagueEndDate('');
    setLeagueStartTime('18:00');
    setLeagueEndTime('21:00');
    setLeagueFormat('fours');
    setLeagueIsSets(false);
    setLeagueSetsEnds(8);
    setLeagueForceEven(true);
    setLeagueRinks([]);
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
    setLeagueIsSets(league.is_sets || false);
    setLeagueSetsEnds(league.sets_ends || 8);
    setLeagueForceEven(league.force_even_fixtures !== false);
    setLeagueRinks(league.league_rinks || []);
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
    if (!leagueStartTime || !leagueEndTime) {
      toast.error('Please select a match session');
      return;
    }

    const data = {
      club_id: clubId,
      name: leagueName.trim(),
      description: leagueDescription.trim(),
      status: leagueStatus,
      start_date: leagueStartDate || null,
      end_date: leagueEndDate || null,
      start_time: leagueStartTime || null,
      end_time: leagueEndTime || null,
      format: leagueFormat,
      is_sets: leagueIsSets,
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

  const generateRoundRobinFixtures = (leagueTeams) => {
    const numTeams = leagueTeams.length;
    if (numTeams < 2) return [];
    
    // Add bye if odd number of teams
    const teamsList = [...leagueTeams];
    if (numTeams % 2 !== 0) {
      teamsList.push({ id: 'BYE', name: 'BYE' });
    }
    
    const n = teamsList.length;
    const rounds = [];
    
    // Round robin algorithm
    for (let round = 0; round < n - 1; round++) {
      const roundMatches = [];
      for (let match = 0; match < n / 2; match++) {
        const home = (round + match) % (n - 1);
        let away = (n - 1 - match + round) % (n - 1);
        
        if (match === 0) {
          away = n - 1;
        }
        
        const homeTeam = teamsList[home];
        const awayTeam = teamsList[away];
        
        // Skip matches with BYE
        if (homeTeam.id !== 'BYE' && awayTeam.id !== 'BYE') {
          roundMatches.push({
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
          });
        }
      }
      rounds.push(roundMatches);
    }
    
    return rounds;
  };

  const buildFixtureList = (league, leagueTeams, shuffleSeed = 0) => {
    const startDate = parseISO(league.start_date);
    const endDate = parseISO(league.end_date);

    // Blacklisted individual dates
    const blacklistedSet = new Set((league.blacklisted_dates || []).map(bl => bl.date));
    const isDateBlacklisted = (date) => blacklistedSet.has(format(date, 'yyyy-MM-dd'));

    // Generate weekly dates
    const weeks = [];
    let currentDate = startDate;
    while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      if (!isDateBlacklisted(currentDate)) weeks.push(currentDate);
      currentDate = addDays(currentDate, 7);
    }

    // Determine which rinks to use (may be date-specific for adjacent rinks)
    const rinkCount = club?.rink_count || 6;
    const allClubRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

    // Helper: get rinks available for a given date string
    const getRinksForDate = (dateKey) => {
      if (league.adjacent_rinks && league.adjacent_rinks_periods && league.adjacent_rinks_periods.length > 0) {
        const period = league.adjacent_rinks_periods.find(p =>
          p.start_date && p.end_date && dateKey >= p.start_date && dateKey <= p.end_date
        );
        if (period && period.rinks && period.rinks.length > 0) {
          return period.rinks.slice().sort((a, b) => a - b);
        }
        // Date not covered by any period — fall back to all rinks
        return allClubRinks;
      }
      // Not adjacent mode — use league_rinks or all
      return (league.league_rinks && league.league_rinks.length > 0)
        ? league.league_rinks.slice().sort((a, b) => a - b)
        : allClubRinks;
    };

    // For overall distribution stats we still need a flat list of all rinks used
    const availableRinks = (league.league_rinks && league.league_rinks.length > 0)
      ? league.league_rinks.slice().sort((a, b) => a - b)
      : allClubRinks;

    // Seeded pseudo-random shuffle (Fisher-Yates) so each redraw is different
    const seededRandom = (() => {
      let seed = shuffleSeed * 1234567 + 42;
      return () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();

    const shuffleArray = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const rounds = generateRoundRobinFixtures(leagueTeams);
    const forceEven = league.force_even_fixtures !== false;
    const availableWeeks = weeks.length;
    const repetitions = forceEven ? Math.floor(availableWeeks / rounds.length) : null;

    // --- Step 1: build the flat list of (match, date) pairs without rink assignments ---
    const unassigned = []; // { home_team_id, away_team_id, match_date }
    let weekIndex = 0;

    const collectRound = (round, matchDate) => {
      const dateKey = format(matchDate, 'yyyy-MM-dd');
      for (const match of round) {
        unassigned.push({ home_team_id: match.home_team_id, away_team_id: match.away_team_id, match_date: dateKey });
      }
    };

    if (forceEven) {
      for (let rep = 0; rep < repetitions && weekIndex < availableWeeks; rep++) {
        for (let roundIdx = 0; roundIdx < rounds.length && weekIndex < availableWeeks; roundIdx++) {
          collectRound(rounds[roundIdx], weeks[weekIndex]);
          weekIndex++;
        }
      }
    } else {
      while (weekIndex < availableWeeks) {
        collectRound(rounds[weekIndex % rounds.length], weeks[weekIndex]);
        weekIndex++;
      }
    }

    // --- Step 2: shuffle fixtures randomly (different each redraw) ---
    const shuffledFixtures = shuffleArray(unassigned);

    // --- Step 3: compute balanced target counts per rink ---
    // base = floor(N / V), first `remainder` rinks get base+1
    const N = shuffledFixtures.length;
    const V = availableRinks.length;
    const base = Math.floor(N / V);
    const remainder = N % V;

    // Shuffle rink order so the "extra" match rinks vary each redraw
    const shuffledRinks = shuffleArray(availableRinks);
    const rinkTarget = {}; // rink -> target count
    shuffledRinks.forEach((r, i) => { rinkTarget[r] = base + (i < remainder ? 1 : 0); });
    const rinkAssigned = {}; // rink -> assigned so far
    availableRinks.forEach(r => { rinkAssigned[r] = 0; });

    // --- Step 4: assign rinks respecting date conflicts and targets ---
    const dateRinkUsage = {}; // dateKey -> Set of rinks used that day
    const allFixtures = [];

    for (const match of shuffledFixtures) {
      const dateKey = match.match_date;
      if (!dateRinkUsage[dateKey]) dateRinkUsage[dateKey] = new Set();

      // Use date-specific rinks when adjacent rinks mode is enabled
      const dateRinks = getRinksForDate(dateKey);

      // Candidate rinks: not used on this date, and still below target
      const candidates = dateRinks.filter(
        r => !dateRinkUsage[dateKey].has(r) && rinkAssigned[r] < rinkTarget[r]
      );

      // Fallback: any rink not used on this date (ignores target — avoids dropping fixtures)
      const fallback = dateRinks.filter(r => !dateRinkUsage[dateKey].has(r));

      const pool = candidates.length > 0 ? candidates : fallback;
      if (pool.length === 0) continue; // truly no rink available on this date — skip

      // Among pool, pick the rink with fewest assignments so far (with random tie-breaking)
      const minAssigned = Math.min(...pool.map(r => rinkAssigned[r]));
      const tied = pool.filter(r => rinkAssigned[r] === minAssigned);
      const chosenRink = tied[Math.floor(seededRandom() * tied.length)];

      dateRinkUsage[dateKey].add(chosenRink);
      rinkAssigned[chosenRink]++;

      allFixtures.push({
        league_id: league.id,
        club_id: clubId,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        match_date: dateKey,
        rink_number: chosenRink,
        status: 'scheduled',
      });
    }

    return allFixtures;
  };

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
    setDistributionModalOpen(true);
  };

  const handleConfirmFixtures = async () => {
    setGeneratingFixtures(true);
    await base44.entities.LeagueFixture.bulkCreate(pendingFixtures);
    await base44.entities.League.update(pendingFixtureLeague.id, { fixtures_generated: true });
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    setGeneratingFixtures(false);
    setDistributionModalOpen(false);
    setPendingFixtures([]);
    setPendingFixtureLeague(null);
    setPendingFixtureTeams([]);
    toast.success(`Generated ${pendingFixtures.length} fixtures`);
  };

  const handleRegenerateFixtures = () => {
    // Use a random seed each time so each redraw produces a genuinely different distribution
    const nextSeed = Math.floor(Math.random() * 999983) + 1;
    setRegenerateCounter(nextSeed);
    const allFixtures = buildFixtureList(pendingFixtureLeague, pendingFixtureTeams, nextSeed);
    setPendingFixtures(allFixtures);
  };

  const handleBookRinks = async (league) => {
    const leagueFixtures = fixtures.filter(f => f.league_id === league.id);
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    
    if (leagueFixtures.length === 0) {
      toast.error('No fixtures to book');
      return;
    }
    
    setBookingRinks(true);

    // Fetch all existing bookings for the dates involved
    const uniqueDates = [...new Set(leagueFixtures.map(f => f.match_date))];
    let allExistingBookings = [];
    for (const date of uniqueDates) {
      const dayBookings = await base44.entities.Booking.filter({ club_id: clubId, date });
      allExistingBookings = [...allExistingBookings, ...dayBookings];
    }

    const rinkCount = club?.rink_count || 6;
    const allRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

    // For custom sessions: expand each fixture into multiple bookings (one per session in range)
    const leagueStartTime = league.start_time || '18:00';
    const leagueEndTime = league.end_time || '21:00';

    const getSessionSlots = () => {
      // If multi-session is enabled and sessions are selected, use those directly
      if (league.multi_session && league.selected_sessions && league.selected_sessions.length > 0) {
        return league.selected_sessions.map(s => ({ start_time: s.start, end_time: s.end }));
      }
      if (club?.use_custom_sessions && club?.custom_sessions?.length > 0) {
        const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const startMins = timeToMins(leagueStartTime);
        const endMins = timeToMins(leagueEndTime);
        return club.custom_sessions.filter(s => timeToMins(s.start) >= startMins && timeToMins(s.end) <= endMins)
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
        booker_name: `League - ${league.name}`,
        booker_email: user.email,
        notes: notesText,
        _fixtureId: slotIdx === 0 ? fixture.id : null, // only link first slot to fixture
      }));
    });

    const clashes = [];
    const nonClashingBookings = [];

    for (const proposed of proposedBookings) {
      const existingBooking = allExistingBookings.find(
        b => b.rink_number === proposed.rink_number &&
             b.date === proposed.date &&
             b.start_time === proposed.start_time &&
             b.status !== 'cancelled' &&
             b.status !== 'rejected'
      );

      if (existingBooking) {
        // Find free rink (not taken by existing bookings or other proposed bookings at same time/date)
        const usedRinks = new Set([
          ...allExistingBookings
            .filter(b => b.date === proposed.date && b.start_time === proposed.start_time && b.status !== 'cancelled' && b.status !== 'rejected')
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
      await doCreateLeagueBookings(nonClashingBookings, leagueFixtures, league);
    } else {
      setClashData({ clashes, nonClashingBookings, league, leagueFixturesForBooking: leagueFixtures, allExistingBookings });
      setClashModalOpen(true);
    }
  };

  const doCreateLeagueBookings = async (bookingsToCreate, leagueFixtures, league) => {
    if (bookingsToCreate.length === 0) {
      toast.info('No bookings created');
      return;
    }
    const cleanBookings = bookingsToCreate.map(({ _fixtureId, ...b }) => b);
    const createdBookings = await base44.entities.Booking.bulkCreate(cleanBookings);

    for (let i = 0; i < bookingsToCreate.length; i++) {
      const fixtureId = bookingsToCreate[i]._fixtureId;
      if (fixtureId && createdBookings[i]?.id) {
        await base44.entities.LeagueFixture.update(fixtureId, { booking_id: createdBookings[i].id });
      }
    }

    await base44.entities.League.update(league.id, { bookings_created: true });
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success(`Fixtures generated and rinks successfully booked. ${createdBookings.length} rink booking${createdBookings.length !== 1 ? 's' : ''} created.`);
  };

  const handleLeagueClashProceed = async (bookingsToCreate) => {
    const { league, leagueFixturesForBooking } = clashData;
    await doCreateLeagueBookings(bookingsToCreate, leagueFixturesForBooking, league);
    setClashModalOpen(false);
  };

  const viewFixtures = (league) => {
    setViewingLeague(league);
    setFixturesDialogOpen(true);
  };

  const openScoreDialog = (fixture) => {
    setEditingFixture(fixture);
    setHomeScore(fixture.home_score?.toString() || '');
    setAwayScore(fixture.away_score?.toString() || '');
    setHomeSets(fixture.home_sets?.toString() || '');
    setAwaySets(fixture.away_sets?.toString() || '');
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
    
    const updateData = {
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      status: 'completed',
    };
    if (isSetsLeague) {
      updateData.home_sets = parseInt(homeSets);
      updateData.away_sets = parseInt(awaySets);
    }

    await base44.entities.LeagueFixture.update(editingFixture.id, updateData);
    
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

  const getLeagueTable = (league) => {
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    const leagueFixtures = fixtures.filter(f => f.league_id === league.id);
    return calculateLeagueTable(league, leagueTeams, leagueFixtures);
  };

  const handlePrintTable = () => {
    const printContent = tableRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${viewingTableLeague?.name} - League Table</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            h1 { font-size: 20px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background: #f5f5f5; font-weight: bold; }
            .team-name { text-align: left; font-weight: 500; }
            .position { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            ${club?.logo_url ? `<img src="${club.logo_url}" class="logo" alt="${club?.name}" />` : ''}
            <div>${club?.name || ''}</div>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSaveTeam = () => {
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

    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
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

        {leaguesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : leagues.length === 0 ? (
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
        ) : club?.alt_view_leagues ? (
          <LeagueAdminTableView
            leagues={leagues}
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
            onBlacklist={(league) => { setBlacklistLeague(league); setBlacklistDialogOpen(true); }}
            generatingFixtures={generatingFixtures}
            bookingRinks={bookingRinks}
            onGenerateScorecards={async (league) => {
              try {
                if (club?.scorecard_format === 'xlsx') {
                  toast.info('Generating CSV scorecards...');
                  const result = await base44.functions.invoke('generateLeagueScorecardsXlsx', { leagueId: league.id, clubId });
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
                  const result = await base44.functions.invoke('generateLeagueScorecards', { leagueId: league.id, clubId });
                  const html = typeof result === 'string' ? result : result?.html || result?.data;
                  if (!html) { toast.error('No scorecard data returned'); return; }
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
                  toast.success('Scorecards ready — use Print > Save as PDF');
                }
              } catch (error) {
                toast.error('Failed to generate scorecards');
              }
            }}
          />
        ) : (
          <div className="space-y-6">
            {leagues.map((league) => {
              const leagueTeams = teams.filter(t => t.league_id === league.id);
              return (
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
                            <CardTitle className="flex items-center gap-2">
                              {league.name}
                              <Badge className={statusColors[league.status || 'draft']}>
                                {league.status || 'draft'}
                              </Badge>
                              {league.format && (
                                <Badge variant="outline">
                                  {league.format === 'triples' ? 'Triples' : 'Fours'}
                                </Badge>
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
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {!league.fixtures_generated && leagueTeams.length >= 2 && league.start_date && league.end_date && (
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => viewFixtures(league)}
                              >
                                <List className="w-4 h-4 mr-1" />
                                Fixtures
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openScoresModal(league)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Scores
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => viewLeagueTable(league)}
                              >
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Table
                              </Button>
<Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                 try {
                                   if (club?.scorecard_format === 'xlsx') {
                                     toast.info('Generating CSV scorecards...');
                                     const result = await base44.functions.invoke('generateLeagueScorecardsXlsx', { leagueId: league.id, clubId });
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
                                     const result = await base44.functions.invoke('generateLeagueScorecards', { leagueId: league.id, clubId });
                                     const html = typeof result === 'string' ? result : result?.html || result?.data;
                                     if (!html) { toast.error('No scorecard data returned'); return; }
                                     const printWindow = window.open('', '_blank');
                                     printWindow.document.write(html);
                                     printWindow.document.close();
                                     printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
                                     toast.success('Scorecards ready — use Print > Save as PDF');
                                   }
                                 } catch (error) {
                                   toast.error('Failed to generate scorecards');
                                   console.error(error);
                                 }
                                }}
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                Scorecards
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setBlacklistLeague(league);
                              setBlacklistDialogOpen(true);
                            }}
                            title="Blacklist dates"
                          >
                            <CalendarX className="w-4 h-4 mr-1" />
                            <span className="hidden md:inline">Blacklist</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditLeague(league)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteLeagueId(league.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Teams ({leagueTeams.length})
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openAddTeam(league)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Team
                        </Button>
                      </div>

                      {leagueTeams.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No teams in this league yet
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {leagueTeams.map((team) => (
                            <div 
                              key={team.id}
                              className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900">{team.name}</h5>
                                  {team.captain_email ? (
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                      <UserCircle className="w-4 h-4" />
                                      {team.captain_name || team.captain_email}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 mt-1">No captain assigned</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditTeam(team)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteTeamId(team.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* League Dialog */}
        <Dialog open={leagueDialogOpen} onOpenChange={resetLeagueForm}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>{editingLeague ? 'Edit League' : 'Create League'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                        const key = `${session.start}|${session.end}`;
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
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Status</Label>
                  <Select value={leagueStatus} onValueChange={setLeagueStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Adjacent Rinks (outdoor only) */}
              {club?.season === 'outdoor' && (
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
                        const rinkCount = club?.rink_count || 6;
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

              {/* Rink selection — hidden when Adjacent Rinks is on */}
              {club && !leagueAdjacentRinks && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="font-medium">Rinks for this league</Label>
                    <p className="text-xs text-gray-500 mt-0.5">Select which rinks will be used when generating fixtures. Leave all unchecked to use all club rinks.</p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {Array.from({ length: club.rink_count || 6 }, (_, i) => i + 1).map(rinkNum => (
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

              <div className="border rounded-lg p-4 space-y-3">
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
              <Button variant="outline" onClick={resetLeagueForm}>Cancel</Button>
              <Button 
                onClick={handleSaveLeague}
                disabled={createLeagueMutation.isPending || updateLeagueMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createLeagueMutation.isPending || updateLeagueMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingLeague ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Dialog */}
        <Dialog open={teamDialogOpen} onOpenChange={resetTeamForm}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Edit Team' : `Add Team to ${selectedLeague?.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Team Name *</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Team A"
                />
              </div>
              <div>
                <Label>Team Captain</Label>
                <MemberSearchSelect
                  members={members}
                  value={captainEmail}
                  onValueChange={(v) => setCaptainEmail(v || '')}
                  placeholder="Select a captain (optional)"
                  clearLabel="— No Captain —"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetTeamForm}>Cancel</Button>
              <Button 
                onClick={handleSaveTeam}
                disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createTeamMutation.isPending || updateTeamMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTeam ? 'Update' : 'Add Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete League Confirmation */}
        <AlertDialog open={!!deleteLeagueId} onOpenChange={() => setDeleteLeagueId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete League?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this league and all its teams. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteLeagueMutation.mutate(deleteLeagueId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
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
                This will permanently delete this team. This action cannot be undone.
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

        {/* Fixtures Dialog */}
        <Dialog open={fixturesDialogOpen} onOpenChange={() => setFixturesDialogOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{viewingLeague?.name} - Fixtures</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingLeague && fixtures
                .filter(f => f.league_id === viewingLeague.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date))
                .map(fixture => {
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
              {viewingLeague && fixtures.filter(f => f.league_id === viewingLeague.id).length === 0 && (
                <p className="text-center text-gray-500 py-4">No fixtures generated yet</p>
              )}
            </div>
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
                          <Input type="number" min="0" value={homeSets} onChange={(e) => setHomeSets(e.target.value)} className="text-center" placeholder="0" />
                        </div>
                        <div className="text-center text-gray-400 pt-6 text-sm">sets</div>
                        <div className="text-left">
                          <Label className="block mb-2 text-xs">{awayTeam?.name}</Label>
                          <Input type="number" min="0" value={awaySets} onChange={(e) => setAwaySets(e.target.value)} className="text-center" placeholder="0" />
                        </div>
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
          rinkCount={club?.rink_count || 6}
          leagueRinks={pendingFixtureLeague?.league_rinks}
          onRegenerate={handleRegenerateFixtures}
          onConfirm={handleConfirmFixtures}
          isLoading={generatingFixtures}
        />

        {/* Blacklist Dates Dialog */}
        <BlacklistDatesDialog
          open={blacklistDialogOpen}
          onClose={() => setBlacklistDialogOpen(false)}
          league={blacklistLeague ? (leagues.find(l => l.id === blacklistLeague.id) || blacklistLeague) : null}
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

        {/* League Table Dialog */}
        <Dialog open={tableDialogOpen} onOpenChange={() => setTableDialogOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewingTableLeague?.name} - League Table</span>
                <Button variant="outline" size="sm" onClick={handlePrintTable}>
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div ref={tableRef}>
              {viewingTableLeague && (() => {
                const table = getLeagueTable(viewingTableLeague);
                const scoringRules = viewingTableLeague.is_sets ? getScoringRules(viewingTableLeague) : [];
                return (
                  <>
                    <h1>{viewingTableLeague.name}</h1>
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}