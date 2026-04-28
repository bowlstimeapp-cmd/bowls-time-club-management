import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
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

// Calculate points for a prediction vs actual MatchScore
function calcPoints(prediction, matchScore, rinks) {
  if (!matchScore || !prediction) return 0;
  let pts = 0;

  const clubScores = matchScore.club_scores || {};
  const oppScores = matchScore.opposition_scores || {};

  // Rink-level
  for (const rink of rinks) {
    const key = `rink${rink.number}`;
    const predClub = prediction.rink_predictions?.[key]?.club;
    const predOpp = prediction.rink_predictions?.[key]?.opposition;
    const actualClub = parseInt(clubScores[key]);
    const actualOpp = parseInt(oppScores[key]);

    if (predClub === undefined || predOpp === undefined) continue;
    if (isNaN(actualClub) || isNaN(actualOpp)) continue;

    // 4 pts: exact rink score
    if (predClub === actualClub && predOpp === actualOpp) {
      pts += 4;
    } else {
      // 2 pts: correct rink result direction
      const predDir = Math.sign(predClub - predOpp);
      const actualDir = Math.sign(actualClub - actualOpp);
      if (predDir === actualDir) pts += 2;
    }
  }

  // Overall score
  const actualClubTotal = Object.values(clubScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const actualOppTotal = Object.values(oppScores).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const predClubTotal = prediction.predicted_club_total ?? 0;
  const predOppTotal = prediction.predicted_opposition_total ?? 0;

  if (predClubTotal === actualClubTotal && predOppTotal === actualOppTotal) {
    pts += 10;
  } else {
    const predDir = Math.sign(predClubTotal - predOppTotal);
    const actualDir = Math.sign(actualClubTotal - actualOppTotal);
    if (predDir === actualDir) pts += 6;
  }

  return pts;
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

  // Only published + prediction_enabled
  const fixtures = allSelections.filter(s => s.status === 'published' && s.prediction_enabled);

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

  const today = startOfDay(new Date());
  const canPredict = currentFixture
    ? isBefore(today, parseISO(currentFixture.match_date))
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

  const togglePredictionMutation = useMutation({
    mutationFn: ({ selectionId, enabled }) =>
      base44.entities.TeamSelection.update(selectionId, { prediction_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections', clubId] });
    },
  });

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
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Rink Predictions</span>
                      {!canPredict && (
                        <span className="text-xs font-normal text-gray-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Predictions closed
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 px-1">
                        <span>Rink</span>
                        <span className="text-center">{club?.name || 'Club'}</span>
                        <span className="text-center">Opposition</span>
                      </div>
                      {rinks.map(rink => {
                        const key = `rink${rink.number}`;
                        const clubVal = rinkInputs[key]?.club ?? '';
                        const oppVal = rinkInputs[key]?.opposition ?? '';
                        // Collect players for this rink
                        const rinkPlayers = POSITIONS
                          .map(pos => {
                            const email = currentFixture.selections?.[`rink${rink.number}_${pos}`];
                            if (!email) return null;
                            return getMemberName(email);
                          })
                          .filter(Boolean);
                        return (
                          <div key={rink.number} className="grid grid-cols-3 items-start gap-2 py-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Rink {rink.number}</span>
                                <Badge className={`text-xs ${rink.isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {rink.isHome ? 'H' : 'A'}
                                </Badge>
                              </div>
                              {rinkPlayers.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {rinkPlayers.map((name, i) => (
                                    <li key={i} className="text-xs text-gray-400 leading-tight">{name}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <Input
                              type="number" min="0"
                              className="text-center h-8 mt-0.5"
                              value={clubVal}
                              disabled={!canPredict}
                              onChange={e => setRinkInputs(prev => ({
                                ...prev,
                                [key]: { ...prev[key], club: e.target.value === '' ? '' : parseInt(e.target.value) }
                              }))}
                            />
                            <Input
                              type="number" min="0"
                              className="text-center h-8 mt-0.5"
                              value={oppVal}
                              disabled={!canPredict}
                              onChange={e => setRinkInputs(prev => ({
                                ...prev,
                                [key]: { ...prev[key], opposition: e.target.value === '' ? '' : parseInt(e.target.value) }
                              }))}
                            />
                          </div>
                        );
                      })}
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
                          return (
                            <div
                              key={pred.id}
                              className={`grid grid-cols-4 items-center px-2 py-2 rounded-lg ${isMe ? 'bg-emerald-50 border border-emerald-200' : idx % 2 === 0 ? 'bg-gray-50' : ''}`}
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
                                {pred.predicted_club_total ?? '—'}–{pred.predicted_opposition_total ?? '—'}
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
                        return (
                          <div
                            key={row.email}
                            className={`grid grid-cols-4 items-center px-2 py-2.5 rounded-lg ${isMe ? 'bg-emerald-50 border border-emerald-200' : idx % 2 === 0 ? 'bg-gray-50' : ''}`}
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
                              onCheckedChange={(checked) =>
                                togglePredictionMutation.mutate({ selectionId: sel.id, enabled: checked })
                              }
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
    </div>
  );
}