import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Calendar,
  Target,
  Medal,
  Lock,
  Save,
  Loader2,
  Settings,
  X,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const POSITIONS = ['Skip', '3', '2', 'Lead'];

// Derive rinks from a selection's selections object
function getRinks(selection) {
  if (!selection?.selections) return [];
  const rinks = [];
  const homeRinksCount = selection.home_rinks || 2;
  for (let rinkNum = 1; rinkNum <= 6; rinkNum++) {
    let hasPlayers = false;
    for (const pos of POSITIONS) {
      if (selection.selections[`rink${rinkNum}_${pos}`]) { hasPlayers = true; break; }
    }
    if (hasPlayers) {
      rinks.push({ number: rinkNum, isHome: rinks.length < homeRinksCount });
    }
  }
  return rinks;
}

// Find the "best rink" key: rink with the highest (club - opposition) score
// Returns e.g. "rink2" or null if no scores
function getBestRinkKey(matchScore, rinks) {
  if (!matchScore) return null;
  const clubScores = matchScore.club_scores || {};
  const oppScores = matchScore.opposition_scores || {};
  let bestKey = null;
  let bestDiff = -Infinity;
  let bestClub = -Infinity;
  for (const rink of rinks) {
    const key = `rink${rink.number}`;
    const club = parseInt(clubScores[key]);
    const opp = parseInt(oppScores[key]);
    if (isNaN(club) || isNaN(opp)) continue;
    const diff = club - opp;
    if (diff > bestDiff || (diff === bestDiff && club > bestClub)) {
      bestDiff = diff; bestClub = club; bestKey = key;
    }
  }
  // Only award if the best rink actually won (positive diff)
  return bestDiff > 0 ? bestKey : null;
}

// Which rink did the user predict as the best (highest club - opp)?
function getPredictedBestRinkKey(prediction, rinks) {
  if (!prediction?.rink_predictions) return null;
  let bestKey = null;
  let bestDiff = -Infinity;
  let bestClub = -Infinity;
  for (const rink of rinks) {
    const key = `rink${rink.number}`;
    const club = prediction.rink_predictions[key]?.club;
    const opp = prediction.rink_predictions[key]?.opposition;
    if (club === undefined || opp === undefined || club === '' || opp === '') continue;
    const clubInt = parseInt(club);
    const diff = clubInt - parseInt(opp);
    if (diff > bestDiff || (diff === bestDiff && clubInt > bestClub)) {
      bestDiff = diff; bestClub = clubInt; bestKey = key;
    }
  }
  return bestDiff > 0 ? bestKey : null;
}

// Calculate points for a single rink prediction vs actual
function calcRinkPoints(predClub, predOpp, actualClub, actualOpp) {
  if (predClub === undefined || predOpp === undefined) return 0;
  if (isNaN(actualClub) || isNaN(actualOpp)) return 0;
  let pts = 0;
  // 2 pts for correct result direction (cumulative)
  const predDir = Math.sign(predClub - predOpp);
  const actualDir = Math.sign(actualClub - actualOpp);
  if (predDir === actualDir) pts += 2;
  // 4 pts for exact score (cumulative on top)
  if (predClub === actualClub && predOpp === actualOpp) pts += 4;
  return pts;
}

// Calculate total points for a prediction vs actual MatchScore
// Returns { total, rinkBreakdown: { rinkN: pts }, overallPts, bestRinkPts }
function calcPointsDetail(prediction, matchScore, rinks) {
  if (!matchScore || !prediction) return { total: 0, rinkBreakdown: {}, overallPts: 0, bestRinkPts: 0 };

  const clubScores = matchScore.club_scores || {};
  const oppScores = matchScore.opposition_scores || {};
  const rinkBreakdown = {};
  let total = 0;

  for (const rink of rinks) {
    const key = `rink${rink.number}`;
    const predClub = prediction.rink_predictions?.[key]?.club;
    const predOpp = prediction.rink_predictions?.[key]?.opposition;
    const actualClub = parseInt(clubScores[key]);
    const actualOpp = parseInt(oppScores[key]);
    const pts = calcRinkPoints(predClub, predOpp, actualClub, actualOpp);
    rinkBreakdown[key] = pts;
    total += pts;
  }

  // Overall score
  const actualClubTotal = Object.values(clubScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const actualOppTotal = Object.values(oppScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const predClubTotal = prediction.predicted_club_total ?? 0;
  const predOppTotal = prediction.predicted_opposition_total ?? 0;

  let overallPts = 0;
  // 6 pts for correct overall result (cumulative)
  const predDir = Math.sign(predClubTotal - predOppTotal);
  const actualDir = Math.sign(actualClubTotal - actualOppTotal);
  if (predDir === actualDir) overallPts += 6;
  // 10 pts for exact overall score (cumulative on top)
  if (predClubTotal === actualClubTotal && predOppTotal === actualOppTotal) overallPts += 10;

  total += overallPts;

  // Best rink bonus: 3 pts for correctly identifying the best rink
  const actualBestRink = getBestRinkKey(matchScore, rinks);
  const predBestRink = getPredictedBestRinkKey(prediction, rinks);
  const bestRinkPts = actualBestRink && predBestRink && actualBestRink === predBestRink ? 3 : 0;
  total += bestRinkPts;

  return { total, rinkBreakdown, overallPts, bestRinkPts };
}

function calcPoints(prediction, matchScore, rinks) {
  return calcPointsDetail(prediction, matchScore, rinks).total;
}

export default function ScorePrediction() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('predict');
  const [fixtureIndex, setFixtureIndex] = useState(0);
  const [rinkInputs, setRinkInputs] = useState({});
  const [viewingPrediction, setViewingPrediction] = useState(null); // { email, fixture, matchScore, rinks }

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) navigate(createPageUrl('ClubSelector'));
  }, [clubId, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => { const r = await base44.entities.Club.filter({ id: clubId }); return r[0]; },
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const r = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return r[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: allSelections = [], isLoading: selectionsLoading } = useQuery({
    queryKey: ['selections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId }, '-match_date'),
    enabled: !!clubId,
  });

  // Only published + prediction_enabled, sorted by date ascending
  const fixtures = allSelections
    .filter(s => s.status === 'published' && s.prediction_enabled)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  const { data: allMatchScores = [] } = useQuery({
    queryKey: ['allMatchScores', clubId],
    queryFn: async () => {
      const selectionIds = fixtures.map(f => f.id);
      if (!selectionIds.length) return [];
      const all = await Promise.all(
        selectionIds.map(id => base44.entities.MatchScore.filter({ selection_id: id }))
      );
      return all.flat();
    },
    enabled: fixtures.length > 0,
  });

  const { data: allPredictions = [], isLoading: predsLoading } = useQuery({
    queryKey: ['allPredictions', clubId],
    queryFn: () => base44.entities.ScorePrediction.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const isAdmin = membership?.role === 'admin';
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // Default to the next upcoming fixture (first future date, or last if all past)
  const defaultFixtureIndex = useMemo(() => {
    if (!fixtures.length) return 0;
    const nextIdx = fixtures.findIndex(f => f.match_date >= todayStr);
    return nextIdx === -1 ? fixtures.length - 1 : nextIdx;
  }, [fixtures.map(f => f.id).join(',')]);

  useEffect(() => {
    setFixtureIndex(defaultFixtureIndex);
  }, [defaultFixtureIndex]);

  const currentFixture = fixtures[fixtureIndex];
  const rinks = currentFixture ? getRinks(currentFixture) : [];

  // Load my prediction for current fixture into inputs
  const myPrediction = currentFixture
    ? allPredictions.find(p => p.selection_id === currentFixture.id && p.user_email === user?.email)
    : null;

  useEffect(() => {
    if (!currentFixture) return;
    if (myPrediction?.rink_predictions) {
      setRinkInputs(myPrediction.rink_predictions);
    } else {
      setRinkInputs({});
    }
  }, [currentFixture?.id, myPrediction?.id]);

  const currentMatchScore = currentFixture
    ? allMatchScores.find(ms => ms.selection_id === currentFixture.id)
    : null;

  // Check if admin has temporarily reopened predictions (stored as ISO timestamp on the selection)
  const reopenUntil = currentFixture?.prediction_reopen_until
    ? new Date(currentFixture.prediction_reopen_until)
    : null;
  const isReopenActive = reopenUntil && isAfter(reopenUntil, new Date());

  const canPredict = currentFixture
    ? isBefore(today, parseISO(currentFixture.match_date)) || isReopenActive
    : false;

  // Match has started = today >= match_date
  const matchStarted = currentFixture
    ? !isBefore(today, parseISO(currentFixture.match_date))
    : false;

  // Derived totals from inputs
  const predClubTotal = rinks.reduce((s, r) => s + (parseInt(rinkInputs[`rink${r.number}`]?.club) || 0), 0);
  const predOppTotal = rinks.reduce((s, r) => s + (parseInt(rinkInputs[`rink${r.number}`]?.opposition) || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        club_id: clubId,
        selection_id: currentFixture.id,
        user_email: user.email,
        user_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : (user.full_name || user.email),
        rink_predictions: rinkInputs,
        predicted_club_total: predClubTotal,
        predicted_opposition_total: predOppTotal,
        points: 0,
        points_calculated: false,
      };
      if (myPrediction) {
        return base44.entities.ScorePrediction.update(myPrediction.id, data);
      } else {
        return base44.entities.ScorePrediction.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPredictions', clubId] });
      toast.success('Prediction saved!');
    },
  });

  const [toggleOffConfirm, setToggleOffConfirm] = useState(null); // selection to confirm toggling off
  const [reopenCountdown, setReopenCountdown] = useState('');

  // Countdown timer for reopen window
  useEffect(() => {
    if (!isReopenActive || !reopenUntil) { setReopenCountdown(''); return; }
    const tick = () => {
      const diff = Math.max(0, reopenUntil - new Date());
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setReopenCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
      if (diff === 0) queryClient.invalidateQueries({ queryKey: ['selections', clubId] });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isReopenActive, reopenUntil?.toISOString()]);

  const reopenMutation = useMutation({
    mutationFn: () => {
      const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      return base44.functions.invoke('updateTeamSelection', {
        action: 'update',
        clubId,
        selectionId: currentFixture.id,
        data: { prediction_reopen_until: until },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections', clubId] });
      toast.success('Predictions reopened for 30 minutes');
    },
  });

  const togglePredictionMutation = useMutation({
    mutationFn: ({ selectionId, enabled }) =>
      base44.functions.invoke('updateTeamSelection', {
        action: 'update',
        clubId,
        selectionId,
        data: { prediction_enabled: enabled },
      }),
    onSuccess: (_, { selectionId, enabled, sel }) => {
      queryClient.invalidateQueries({ queryKey: ['selections', clubId] });
      queryClient.invalidateQueries({ queryKey: ['allPredictions', clubId] });
      toast.success(enabled ? 'Fixture enabled for predictions' : 'Fixture removed from predictions');

      // Send a single bulk push notification to all club members when a fixture is enabled
      if (enabled && sel) {
        const matchName = sel.match_name || sel.competition;
        const matchDate = sel.match_date ? format(parseISO(sel.match_date), 'd MMMM yyyy') : '';
        const emails = members.map(m => m.user_email).filter(Boolean);
        if (emails.length > 0) {
          base44.functions.invoke('sendPushNotification', {
            userEmails: emails,
            title: '🎯 Score Prediction Open!',
            message: `${matchName} (${matchDate}) is now available for score predictions. Get your entry in!`,
            url: `/ScorePrediction?clubId=${clubId}`,
          }).catch(() => {});
        }
      }
    },
  });

  const handleToggle = (sel, checked) => {
    if (!checked) {
      // Toggling OFF — show confirmation
      setToggleOffConfirm(sel);
    } else {
      // Toggling ON — do it immediately, pass sel for notification
      togglePredictionMutation.mutate({ selectionId: sel.id, enabled: true, sel });
    }
  };

  // Build leaderboard for current fixture
  const fixtureLeaderboard = currentFixture
    ? allPredictions
        .filter(p => p.selection_id === currentFixture.id)
        .map(p => ({
          ...p,
          computedPoints: currentMatchScore ? calcPoints(p, currentMatchScore, rinks) : null,
        }))
        .sort((a, b) => (b.computedPoints ?? b.points ?? 0) - (a.computedPoints ?? a.points ?? 0))
    : [];

  const getMemberName = (email) => {
    const m = members.find(x => x.user_email === email);
    if (m?.first_name && m?.surname) return `${m.first_name} ${m.surname}`;
    return m?.user_name || email;
  };

  if (!clubId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Target className="w-7 h-7 text-emerald-600" />
            Score Prediction
          </h1>
          <p className="text-gray-600">{club?.name} • Predict match scores and earn points</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full mb-6 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="predict" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="league" className="flex items-center gap-2">
              <Medal className="w-4 h-4" />
              League Table
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Manage Fixtures
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── PREDICTIONS TAB ── */}
          <TabsContent value="predict">
            {/* Scoring logic info */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-semibold text-sm text-amber-900">How points are scored (cumulative)</p>
              <p>↔️ <strong>+2 pts</strong> — Correct rink result (win/loss/draw)</p>
              <p>🎯 <strong>+4 pts</strong> — Exact rink score (awarded on top, total 6 pts)</p>
              <p>⭐ <strong>+3 pts</strong> — Correctly predict which rink wins by the most shots</p>
              <p>✅ <strong>+6 pts</strong> — Correct overall match result</p>
              <p>🏆 <strong>+10 pts</strong> — Exact overall score (awarded on top, total 16 pts)</p>
            </div>
            {selectionsLoading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : fixtures.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">No fixtures available for prediction</p>
                <p className="text-sm mt-1">A club admin needs to enable fixtures in Manage Fixtures.</p>
              </div>
            ) : (
              <>
                {/* Fixture Navigator */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost" size="icon"
                        disabled={fixtureIndex === 0}
                        onClick={() => setFixtureIndex(i => i - 1)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">{fixtureIndex + 1} of {fixtures.length}</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {currentFixture.match_name || currentFixture.competition}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                          <Badge className="bg-emerald-100 text-emerald-700">{currentFixture.competition}</Badge>
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseISO(currentFixture.match_date), 'd MMMM yyyy')}
                          </span>
                          {!canPredict && (
                            <Badge className="bg-gray-100 text-gray-500">
                              <Lock className="w-3 h-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        disabled={fixtureIndex === fixtures.length - 1}
                        onClick={() => setFixtureIndex(i => i + 1)}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Rink Predictions */}
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                      <span>Rink Predictions</span>
                      <div className="flex items-center gap-2">
                        {isReopenActive && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                            🔓 Reopened · {reopenCountdown}
                          </span>
                        )}
                        {!canPredict && !isReopenActive && (
                          <span className="text-xs font-normal text-gray-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Predictions closed
                          </span>
                        )}
                        {isAdmin && matchStarted && (
                          <Button
                            size="sm"
                            variant={isReopenActive ? "outline" : "default"}
                            className={isReopenActive ? "h-7 text-xs border-emerald-300 text-emerald-700" : "h-7 text-xs bg-emerald-600 hover:bg-emerald-700"}
                            onClick={() => reopenMutation.mutate()}
                            disabled={reopenMutation.isPending}
                          >
                            {reopenMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔓'}
                            {isReopenActive ? 'Extend 30 mins' : 'Reopen 30 mins'}
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Live scores banner */}
                    {matchStarted && currentMatchScore && (
                      <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        Live scores are shown below
                      </div>
                    )}
                    {matchStarted && !currentMatchScore && (
                      <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                        Match in progress — scores not yet entered
                      </div>
                    )}
                    <div className="space-y-0">
                      {/* Header */}
                      <div className={`grid text-xs font-semibold text-gray-500 px-1 pb-2 border-b mb-1 ${currentMatchScore ? 'grid-cols-5' : 'grid-cols-3'}`}>
                        <span>Rink</span>
                        <span className="text-center">{club?.name || 'Club'}</span>
                        <span className="text-center">Opposition</span>
                        {currentMatchScore && <span className="text-center text-blue-600">Actual</span>}
                        {currentMatchScore && <span className="text-center text-emerald-700">Pts</span>}
                      </div>
                      {(() => {
                        const actualBestRink = currentMatchScore ? getBestRinkKey(currentMatchScore, rinks) : null;
                        const predBestRink = myPrediction ? getPredictedBestRinkKey(myPrediction, rinks) : null;
                        return rinks.map(rink => {
                        const key = `rink${rink.number}`;
                        const clubVal = rinkInputs[key]?.club ?? '';
                        const oppVal = rinkInputs[key]?.opposition ?? '';
                        // Per-rink points earned (only shown when match score exists)
                        let rinkPts = null;
                        if (currentMatchScore && myPrediction) {
                          const actualClub = parseInt(currentMatchScore.club_scores?.[key]);
                          const actualOpp = parseInt(currentMatchScore.opposition_scores?.[key]);
                          rinkPts = calcRinkPoints(myPrediction.rink_predictions?.[key]?.club, myPrediction.rink_predictions?.[key]?.opposition, actualClub, actualOpp);
                        }
                        const actualClubScore = currentMatchScore ? (currentMatchScore.club_scores?.[key] ?? '—') : null;
                        const actualOppScore = currentMatchScore ? (currentMatchScore.opposition_scores?.[key] ?? '—') : null;
                        const isBestRink = actualBestRink === key;
                        const isPredictedBest = predBestRink === key;
                        // Collect players for this rink
                        const rinkPlayers = POSITIONS
                          .map(pos => {
                            const email = currentFixture.selections?.[`rink${rink.number}_${pos}`];
                            if (!email) return null;
                            return getMemberName(email);
                          })
                          .filter(Boolean);
                        return (
                          <div key={rink.number} className="py-1 border-b last:border-0">
                            {/* Grid row: rink label + inputs (same on mobile & desktop) */}
                            <div className={`grid items-center gap-2 ${currentMatchScore ? 'grid-cols-5' : 'grid-cols-3'}`}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-700">Rink {rink.number}</span>
                                <Badge className={`text-xs ${rink.isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {rink.isHome ? 'H' : 'A'}
                                </Badge>
                              </div>
                              <Input
                                type="number" min="0"
                                className={`text-center h-8 ${isPredictedBest && !currentMatchScore ? 'border-amber-300 bg-amber-50' : ''}`}
                                value={clubVal}
                                disabled={!canPredict}
                                onChange={e => setRinkInputs(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], club: e.target.value === '' ? '' : parseInt(e.target.value) }
                                }))}
                              />
                              <Input
                                type="number" min="0"
                                className={`text-center h-8 ${isPredictedBest && !currentMatchScore ? 'border-amber-300 bg-amber-50' : ''}`}
                                value={oppVal}
                                disabled={!canPredict}
                                onChange={e => setRinkInputs(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], opposition: e.target.value === '' ? '' : parseInt(e.target.value) }
                                }))}
                              />
                              {currentMatchScore && (
                                <div className="text-center text-sm font-semibold text-blue-700">
                                  {actualClubScore}–{actualOppScore}
                                </div>
                              )}
                              {currentMatchScore && (
                                <div className="flex items-center justify-center">
                                  <span className={`text-sm font-bold ${rinkPts > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {rinkPts !== null ? rinkPts : '—'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Players: horizontal on mobile, vertical under rink label on desktop */}
                            {rinkPlayers.length > 0 && (
                              <>
                                {/* Mobile: horizontal pill list below inputs */}
                                <div className="sm:hidden flex flex-wrap gap-1 mt-1.5">
                                  {rinkPlayers.map((name, i) => (
                                    <span key={i} className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{name}</span>
                                  ))}
                                </div>
                                {/* Desktop: vertical list — shown via the grid's first column using negative margin trick */}
                                <div className="hidden sm:block">
                                  {/* Re-render desktop players inline under rink label by overlaying below the grid row */}
                                  <div className={`grid ${currentMatchScore ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                    <ul className="mt-0.5 space-y-0.5">
                                      {rinkPlayers.map((name, i) => (
                                        <li key={i} className="text-xs text-gray-400 leading-tight">{name}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                        }); // end rinks.map
                      })()}
                    </div>

                    {/* Overall predicted score (read-only) */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Overall Predicted Score</p>
                      <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-lg py-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">{club?.name || 'Club'}</p>
                          <p className="text-3xl font-bold text-emerald-700">{predClubTotal}</p>
                        </div>
                        <span className="text-gray-300 text-xl font-light">–</span>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Opposition</p>
                          <p className="text-3xl font-bold text-gray-700">{predOppTotal}</p>
                        </div>
                      </div>
                      {currentMatchScore && (() => {
                        const clubScores = currentMatchScore.club_scores || {};
                        const oppScores = currentMatchScore.opposition_scores || {};
                        const actualClubTotal = Object.values(clubScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
                        const actualOppTotal = Object.values(oppScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
                        return (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1 text-center">Actual Score</p>
                            <div className="flex items-center justify-center gap-6 bg-blue-50 rounded-lg py-2">
                              <div className="text-center">
                                <p className="text-xl font-bold text-blue-700">{actualClubTotal}</p>
                              </div>
                              <span className="text-gray-400 font-light">–</span>
                              <div className="text-center">
                                <p className="text-xl font-bold text-blue-700">{actualOppTotal}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {currentMatchScore && myPrediction && (() => {
                        const detail = calcPointsDetail(myPrediction, currentMatchScore, rinks);
                        return (
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">Rinks: <strong>{Object.values(detail.rinkBreakdown).reduce((s,v)=>s+v,0)} pts</strong></span>
                            {detail.bestRinkPts > 0 && <span className="px-2 py-1 bg-amber-100 rounded-full text-amber-700">⭐ Best rink: <strong>+{detail.bestRinkPts} pts</strong></span>}
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">Overall: <strong>{detail.overallPts} pts</strong></span>
                            <span className="px-2 py-1 bg-emerald-100 rounded-full text-emerald-700 font-bold">Total: {detail.total} pts</span>
                          </div>
                        );
                      })()}
                    </div>

                    {canPredict && (
                      <Button
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {myPrediction ? 'Update Prediction' : 'Save Prediction'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Leaderboard for this fixture */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Medal className="w-4 h-4 text-amber-500" />
                      Leaderboard — {currentFixture.match_name || currentFixture.competition}
                      {!currentMatchScore && (
                        <span className="text-xs font-normal text-gray-400 ml-auto">Points awarded after match</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fixtureLeaderboard.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No predictions yet</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 px-2 mb-2">
                          <span className="col-span-2">Member</span>
                          <span className="text-center">Prediction</span>
                          <span className="text-center">Points</span>
                        </div>
                        {fixtureLeaderboard.map((pred, idx) => {
                          const pts = pred.computedPoints;
                          const isMe = pred.user_email === user?.email;
                          const clickable = matchStarted;
                          return (
                            <div
                              key={pred.id}
                              onClick={clickable ? () => setViewingPrediction({ pred, fixture: currentFixture, matchScore: currentMatchScore, rinks }) : undefined}
                              className={`grid grid-cols-4 items-center px-2 py-2 rounded-lg transition-colors ${isMe ? 'bg-emerald-50 border border-emerald-200' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${clickable ? 'cursor-pointer hover:bg-emerald-50' : ''}`}
                            >
                              <div className="col-span-2 flex items-center gap-2">
                                <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium text-gray-800 truncate">
                                  {getMemberName(pred.user_email)}
                                  {isMe && <span className="text-xs text-emerald-600 ml-1">(you)</span>}
                                </span>
                              </div>
                              <div className="text-center text-sm text-gray-600">
                                {matchStarted ? `${pred.predicted_club_total ?? '—'}–${pred.predicted_opposition_total ?? '—'}` : '–'}
                              </div>
                              <div className="text-center font-bold text-emerald-700">
                                {pts !== null ? pts : <span className="text-gray-300 font-normal">—</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── LEAGUE TABLE TAB ── */}
          <TabsContent value="league">
            {(() => {
              // Aggregate points per user across all fixtures
              const userPointsMap = {};
              for (const fixture of fixtures) {
                const rks = getRinks(fixture);
                const ms = allMatchScores.find(s => s.selection_id === fixture.id);
                const preds = allPredictions.filter(p => p.selection_id === fixture.id);
                for (const pred of preds) {
                  const pts = ms ? calcPoints(pred, ms, rks) : null;
                  if (!userPointsMap[pred.user_email]) {
                    userPointsMap[pred.user_email] = { totalPoints: 0, played: 0, scored: 0 };
                  }
                  userPointsMap[pred.user_email].played += 1;
                  if (pts !== null) {
                    userPointsMap[pred.user_email].totalPoints += pts;
                    userPointsMap[pred.user_email].scored += 1;
                  }
                }
              }

              const leagueRows = Object.entries(userPointsMap)
                .map(([email, data]) => ({ email, ...data }))
                .sort((a, b) => b.totalPoints - a.totalPoints);

              if (leagueRows.length === 0) {
                return (
                  <div className="text-center py-16 text-gray-500">
                    <Medal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-700">No predictions submitted yet</p>
                  </div>
                );
              }

              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Medal className="w-4 h-4 text-amber-500" />
                      Overall League Table
                    </CardTitle>
                    <p className="text-sm text-gray-500">Total points across all prediction fixtures</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 px-2 mb-2">
                        <span className="col-span-2">Member</span>
                        <span className="text-center">Predictions</span>
                        <span className="text-center">Total Pts</span>
                      </div>
                      {leagueRows.map((row, idx) => {
                        const isMe = row.email === user?.email;
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                        // Find the most recent scored fixture for this user to show on click
                        const lastScoredFixture = fixtures
                          .slice()
                          .reverse()
                          .find(f => {
                            const ms = allMatchScores.find(s => s.selection_id === f.id);
                            const pred = allPredictions.find(p => p.selection_id === f.id && p.user_email === row.email);
                            return !!ms && !!pred;
                          });
                        const clickable = !!lastScoredFixture;
                        return (
                          <div
                            key={row.email}
                            onClick={clickable ? () => {
                              const fixture = lastScoredFixture;
                              const matchScore = allMatchScores.find(s => s.selection_id === fixture.id);
                              const pred = allPredictions.find(p => p.selection_id === fixture.id && p.user_email === row.email);
                              const rks = getRinks(fixture);
                              setViewingPrediction({ pred, fixture, matchScore, rinks: rks });
                              setActiveTab('predict');
                            } : undefined}
                            className={`grid grid-cols-4 items-center px-2 py-2.5 rounded-lg transition-colors ${isMe ? 'bg-emerald-50 border border-emerald-200' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${clickable ? 'cursor-pointer hover:bg-emerald-50' : ''}`}
                          >
                            <div className="col-span-2 flex items-center gap-2">
                              <span className={`text-xs font-bold w-6 text-center ${idx < 3 ? 'text-lg' : 'text-gray-400'}`}>
                                {medal || idx + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {getMemberName(row.email)}
                                {isMe && <span className="text-xs text-emerald-600 ml-1">(you)</span>}
                              </span>
                            </div>
                            <div className="text-center text-sm text-gray-500">
                              {row.scored}/{row.played}
                            </div>
                            <div className="text-center font-bold text-emerald-700 text-lg">
                              {row.totalPoints}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* ── ADMIN TAB ── */}
          {isAdmin && (
            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enable Fixtures for Prediction</CardTitle>
                  <p className="text-sm text-gray-500">Toggle which published matches appear in Score Prediction.</p>
                </CardHeader>
                <CardContent>
                  {selectionsLoading ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : allSelections.filter(s => s.status === 'published').length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No published selections found.</p>
                  ) : (
                    <div className="space-y-2">
                      {allSelections
                        .filter(s => s.status === 'published')
                        .sort((a, b) => a.match_date.localeCompare(b.match_date))
                        .map(sel => (
                          <div key={sel.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">
                                {sel.match_name || sel.competition}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{sel.competition}</Badge>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(sel.match_date), 'd MMM yyyy')}
                                </span>
                              </div>
                            </div>
                            <Switch
                              checked={!!sel.prediction_enabled}
                              disabled={togglePredictionMutation.isPending && togglePredictionMutation.variables?.selectionId === sel.id}
                              onCheckedChange={(checked) => handleToggle(sel, checked)}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Toggle Off Confirmation Dialog */}
      <Dialog open={!!toggleOffConfirm} onOpenChange={() => setToggleOffConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Remove fixture from predictions?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-gray-700">
            <p>
              You are about to disable <strong>{toggleOffConfirm?.match_name || toggleOffConfirm?.competition}</strong> ({toggleOffConfirm?.match_date ? format(parseISO(toggleOffConfirm.match_date), 'd MMM yyyy') : ''}) from Score Prediction.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs space-y-1">
              <p className="font-semibold">⚠️ This will hide the fixture from members — but all existing predictions and scores are <u>not</u> deleted.</p>
              <p>You can re-enable the fixture at any time and all data will be restored.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleOffConfirm(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                togglePredictionMutation.mutate({ selectionId: toggleOffConfirm.id, enabled: false });
                setToggleOffConfirm(null);
              }}
            >
              Yes, remove from predictions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prediction Detail Modal */}
      <Dialog open={!!viewingPrediction} onOpenChange={() => setViewingPrediction(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {viewingPrediction && (() => {
            const { pred, fixture, matchScore, rinks: modalRinks } = viewingPrediction;
            const detail = matchScore ? calcPointsDetail(pred, matchScore, modalRinks) : null;
            const actualBestRink = matchScore ? getBestRinkKey(matchScore, modalRinks) : null;
            const predBestRink = getPredictedBestRinkKey(pred, modalRinks);
            const clubScores = matchScore?.club_scores || {};
            const oppScores = matchScore?.opposition_scores || {};
            const actualClubTotal = Object.values(clubScores).reduce((s,v) => s+(parseInt(v)||0), 0);
            const actualOppTotal = Object.values(oppScores).reduce((s,v) => s+(parseInt(v)||0), 0);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {getMemberName(pred.user_email)}'s Predictions
                  </DialogTitle>
                  <p className="text-sm text-gray-500">
                    {fixture.match_name || fixture.competition} · {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                  </p>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Rink breakdown */}
                  <div>
                    <div className="grid grid-cols-5 text-xs font-semibold text-gray-500 px-1 pb-2 border-b mb-1">
                      <span>Rink</span>
                      <span className="text-center col-span-2">Prediction</span>
                      {matchScore && <span className="text-center text-blue-600">Actual</span>}
                      {matchScore && <span className="text-center text-emerald-700">Pts</span>}
                    </div>
                    {modalRinks.map(rink => {
                      const key = `rink${rink.number}`;
                      const predClub = pred.rink_predictions?.[key]?.club ?? '—';
                      const predOpp = pred.rink_predictions?.[key]?.opposition ?? '—';
                      const actualClub = matchScore ? (clubScores[key] ?? '—') : null;
                      const actualOpp = matchScore ? (oppScores[key] ?? '—') : null;
                      const rinkPts = detail?.rinkBreakdown?.[key] ?? null;
                      const isBest = actualBestRink === key;
                      return (
                        <div key={rink.number} className="grid grid-cols-5 items-center px-1 py-2 border-b last:border-0 gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">R{rink.number}</span>
                            {isBest && <Star className="w-3 h-3 text-amber-500 fill-amber-400" />}
                          </div>
                          <div className="col-span-2 text-center text-sm font-medium">
                            {predClub}–{predOpp}
                          </div>
                          {matchScore && (
                            <div className="text-center text-sm font-semibold text-blue-700">
                              {actualClub}–{actualOpp}
                            </div>
                          )}
                          {matchScore && (
                            <div className="text-center">
                              <span className={`text-sm font-bold ${rinkPts > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {rinkPts !== null ? `${rinkPts}/6` : '—'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Best rink section */}
                  {matchScore && (() => {
                    const gotBestRink = actualBestRink && predBestRink && actualBestRink === predBestRink;
                    const actualBestNum = actualBestRink ? actualBestRink.replace('rink', '') : null;
                    const predBestNum = predBestRink ? predBestRink.replace('rink', '') : null;
                    return (
                      <div className={`rounded-lg p-3 ${gotBestRink ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">⭐ Best Rink Bonus</p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="space-y-0.5">
                            <p className="text-gray-600">Predicted best: <strong>Rink {predBestNum ?? '—'}</strong></p>
                            <p className="text-gray-600">Actual best: <strong>{actualBestNum ? `Rink ${actualBestNum}` : 'None (no rink won)'}</strong></p>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${gotBestRink ? 'text-amber-600' : 'text-gray-400'}`}>
                              {gotBestRink ? '+3' : '0'}/3 pts
                            </span>
                            {gotBestRink && <p className="text-xs text-amber-600">Correct! ✓</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Overall */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Overall</p>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Predicted</span>
                      <span className="font-bold">{pred.predicted_club_total ?? '—'} – {pred.predicted_opposition_total ?? '—'}</span>
                    </div>
                    {matchScore && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Actual</span>
                        <span className="font-bold text-blue-700">{actualClubTotal} – {actualOppTotal}</span>
                      </div>
                    )}
                  </div>

                  {/* Points summary */}
                  {detail && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Points Breakdown</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                          Rinks: <strong>{Object.values(detail.rinkBreakdown).reduce((s,v)=>s+v,0)} pts</strong>
                        </span>
                        {detail.bestRinkPts > 0 && (
                          <span className="px-2 py-1 bg-amber-100 rounded-full text-amber-700">
                            ⭐ Best rink: <strong>+{detail.bestRinkPts} pts</strong>
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                          Overall: <strong>{detail.overallPts} pts</strong>
                        </span>
                        <span className="px-2 py-1 bg-emerald-100 rounded-full text-emerald-700 font-bold">
                          Total: {detail.total} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}