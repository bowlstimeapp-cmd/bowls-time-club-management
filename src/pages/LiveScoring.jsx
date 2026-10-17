import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, Trophy, Calendar, Pencil } from 'lucide-react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';

const POSITIONS = ['Skip', '3', '2', 'Lead'];

// A server payload may lag behind a just-completed save (refetch race),
// so ignore data for a venue older than the version stamp of our last save.
const isNewerThanLastSave = (stampRef, serverStamp) =>
  !stampRef.current || !serverStamp || serverStamp >= stampRef.current;

// Top Club events (indoor + outdoor) — selection keys are `${eventId}_${position}`
const TOP_CLUB_EVENTS = [
  { id: 'mens_two_wood', name: "Men's Two Wood", positions: ['Player'] },
  { id: 'ladies_two_wood', name: "Ladies' Two Wood", positions: ['Player'] },
  { id: 'two_wood_singles', name: '2 Wood Singles', positions: ['Player'] },
  { id: 'four_wood_singles', name: '4 Wood Singles', positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triple', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

export default function LiveScoring() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const selectionId = searchParams.get('selectionId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [oppositionPlayers, setOppositionPlayers] = useState({});
  const [clubScores, setClubScores] = useState({});
  const [oppositionScores, setOppositionScores] = useState({});
  const [ends, setEnds] = useState({});
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editedSelections, setEditedSelections] = useState({});
  const [editedNames, setEditedNames] = useState({});
  const homeDirtyRef = useRef(false);
  const awayDirtyRef = useRef(false);
  const oppDirtyRef = useRef(false);
  const lastHomeStampRef = useRef(null);
  const lastAwayStampRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId || !selectionId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, selectionId, navigate]);

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

  const { data: selection } = useQuery({
    queryKey: ['selection', selectionId],
    queryFn: async () => {
      const selections = await base44.entities.TeamSelection.filter({ id: selectionId });
      return selections[0];
    },
    enabled: !!selectionId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const { data: matchScore } = useQuery({
    queryKey: ['matchScore', selectionId],
    queryFn: async () => {
      const scores = await base44.entities.MatchScore.filter({ selection_id: selectionId });
      return scores[0];
    },
    enabled: !!selectionId,
  });

  useEffect(() => {
    if (!matchScore) return;
    // Merge per venue so unsaved edits are never clobbered by a refetch,
    // and skip any refetched data older than our own last save.
    if (!homeDirtyRef.current && isNewerThanLastSave(lastHomeStampRef, matchScore.home_updated_date)) {
      setClubScores(matchScore.club_scores || {});
      setEnds(matchScore.ends || {});
    }
    if (!awayDirtyRef.current && isNewerThanLastSave(lastAwayStampRef, matchScore.away_updated_date)) {
      setOppositionScores(matchScore.opposition_scores || {});
    }
    if (!oppDirtyRef.current) {
      setOppositionPlayers(matchScore.opposition_players || {});
    }
  }, [matchScore]);

  // Realtime: when another scorer saves, receive the change without polling.
  // Merge per venue: each scorer keeps their own unsaved edits for their venue.
  useEffect(() => {
    if (!selectionId) return;
    const unsubscribe = base44.entities.MatchScore.subscribe((event) => {
      if (event.data?.selection_id !== selectionId) return;
      if (!homeDirtyRef.current && isNewerThanLastSave(lastHomeStampRef, event.data.home_updated_date)) {
        setClubScores(event.data.club_scores || {});
        setEnds(event.data.ends || {});
      }
      if (!awayDirtyRef.current && isNewerThanLastSave(lastAwayStampRef, event.data.away_updated_date)) {
        setOppositionScores(event.data.opposition_scores || {});
      }
      if (!oppDirtyRef.current) {
        setOppositionPlayers(event.data.opposition_players || {});
      }
    });
    return unsubscribe;
  }, [selectionId]);

  useEffect(() => {
    if (selection?.selections) {
      setEditedSelections(selection.selections);
      setEditedNames(selection.selection_names || {});
    }
  }, [selection]);

  // Saving goes through a backend function so any club admin/selector/live scorer
  // can save, regardless of who originally created the score record.
  const saveScoreMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('saveMatchScore', data),
    onSuccess: (result, variables) => {
      const saved = result?.data || {};
      if (variables.scope === 'home') {
        homeDirtyRef.current = false;
        if (saved.home_updated_date) lastHomeStampRef.current = saved.home_updated_date;
      }
      if (variables.scope === 'away') {
        awayDirtyRef.current = false;
        if (saved.away_updated_date) lastAwayStampRef.current = saved.away_updated_date;
      }
      if (variables.opposition_players !== undefined) oppDirtyRef.current = false;
      // Write the saved values straight into the cache so the screen reflects
      // the save immediately instead of waiting for (and racing) the refetch.
      queryClient.setQueryData(['matchScore', selectionId], (old) => {
        if (!old) return old;
        const next = { ...old };
        if (variables.scope === 'home') {
          next.club_scores = variables.club_scores;
          next.ends = variables.ends;
          if (saved.home_updated_date) next.home_updated_date = saved.home_updated_date;
        } else if (variables.scope === 'away') {
          next.opposition_scores = variables.opposition_scores;
          if (saved.away_updated_date) next.away_updated_date = saved.away_updated_date;
        }
        if (variables.opposition_players !== undefined) next.opposition_players = variables.opposition_players;
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['matchScore', selectionId] });
      toast.success('Scores saved');
    },
    onError: () => {
      toast.error('Failed to save scores');
    },
  });

  const updateSelectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamSelection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection', selectionId] });
      toast.success('Team selection updated');
      setEditTeamOpen(false);
    },
  });

  const handleSaveTeamEdit = () => {
    updateSelectionMutation.mutate({
      id: selectionId,
      data: { selections: editedSelections, selection_names: editedNames }
    });
  };

  const canEdit = membership?.role === 'admin' || membership?.role === 'live_scorer' || membership?.role === 'selector';
  const isTopClub = selection?.competition === 'Top Club';

  const selectionNames = selection?.selection_names || {};
  const getMemberName = (email, positionKey) => {
    if (positionKey && selectionNames[positionKey]) return selectionNames[positionKey];
    const member = members.find(m => m.user_email === email);
    if (member?.first_name && member?.surname) {
      return `${member.first_name} ${member.surname}`;
    }
    return member?.user_name || email || 'TBD';
  };

  const nameOf = (m) => m?.first_name && m?.surname
    ? `${m.first_name} ${m.surname}`
    : m?.user_name || m?.user_email || 'TBD';

  const getSelectedMemberId = (posKey) => {
    const email = editedSelections[posKey];
    if (!email) return '';
    const storedName = editedNames[posKey];
    const matches = members.filter(m => m.user_email === email);
    const exact = storedName ? matches.find(m => nameOf(m) === storedName) : null;
    return (exact || matches[0])?.id || '';
  };

  const handleSaveHome = () => {
    saveScoreMutation.mutate({
      selectionId,
      clubId,
      scope: 'home',
      club_scores: clubScores,
      ends: ends,
      ...(oppDirtyRef.current ? { opposition_players: oppositionPlayers } : {}),
    });
  };

  const handleSaveAway = () => {
    saveScoreMutation.mutate({
      selectionId,
      clubId,
      scope: 'away',
      opposition_scores: oppositionScores,
      ...(oppDirtyRef.current ? { opposition_players: oppositionPlayers } : {}),
    });
  };

  const isSaving = saveScoreMutation.isPending;

  // Calculate totals
  const calculateTotal = (scores) => {
    return Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
  };

  const clubTotal = calculateTotal(clubScores);
  const oppositionTotal = calculateTotal(oppositionScores);
  const totalEnds = calculateTotal(ends);

  // Build scoring rows: rinks for standard competitions, events for Top Club
  const getMatches = () => {
    if (!selection?.selections) return [];

    if (isTopClub) {
      const matches = [];
      for (const event of TOP_CLUB_EVENTS) {
        const positions = {};
        let hasPlayers = false;
        for (const pos of event.positions) {
          const key = `${event.id}_${pos}`;
          if (selection.selections[key]) {
            hasPlayers = true;
          }
          positions[pos] = selection.selections[key];
        }
        if (hasPlayers) {
          matches.push({
            key: event.id,
            label: event.name,
            badge: null,
            positions,
            positionsList: event.positions,
          });
        }
      }
      return matches;
    }

    // Standard competitions: check all possible rink numbers 1-6
    const matches = [];
    const homeRinksCount = selection.home_rinks || 2;
    for (let rinkNum = 1; rinkNum <= 6; rinkNum++) {
      const rinkPositions = {};
      let hasPlayers = false;
      for (const pos of POSITIONS) {
        const key = `rink${rinkNum}_${pos}`;
        if (selection.selections[key]) {
          hasPlayers = true;
        }
        rinkPositions[pos] = selection.selections[key];
      }
      if (hasPlayers) {
        matches.push({
          key: `rink${rinkNum}`,
          label: String(rinkNum),
          badge: matches.length < homeRinksCount ? 'Home' : 'Away',
          positions: rinkPositions,
          positionsList: POSITIONS,
        });
      }
    }
    return matches;
  };

  const matches = getMatches();

  if (!selection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link 
            to={createPageUrl('Selection') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Scoring</h1>
              <div className="flex items-center gap-3 mt-1 text-gray-600">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  <Trophy className="w-3 h-3 mr-1" />
                  {selection.competition}
                </Badge>
                <span className="flex items-center gap-1 text-sm">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(selection.match_date), 'd MMMM yyyy')}
                </span>
                {selection.match_name && (
                  <span className="text-sm font-medium">{selection.match_name}</span>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveHome}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Home Scores
                </Button>
                <Button
                  onClick={handleSaveAway}
                  disabled={isSaving}
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Away Scores
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Score Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 relative">
              <div className="absolute top-4 right-4 text-white text-sm">
                <span className="text-emerald-200">Total Ends:</span>{' '}
                <span className="font-bold text-lg">{totalEnds}</span>
              </div>
              <h2 className="text-center text-white text-lg font-medium mb-4">Score</h2>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-emerald-100 text-sm mb-1">{club?.name || 'Home'}</p>
                  <p className="text-5xl font-bold text-white">{clubTotal}</p>
                </div>
                <div className="text-2xl text-emerald-200 font-light">vs</div>
                <div className="text-center">
                  <p className="text-emerald-100 text-sm mb-1">Opposition</p>
                  <p className="text-5xl font-bold text-white">{oppositionTotal}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Rinks Scoring - Condensed Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{isTopClub ? 'Match Scores' : 'Rink Scores'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                   <tr className="border-b">
                     <th className="text-left py-2 px-2 text-sm font-medium text-gray-500 w-24">{isTopClub ? 'Match' : 'Rink'}</th>
                     <th className="text-left py-2 px-2 text-sm font-medium text-emerald-700">{club?.name || 'Club'} Team</th>
                     <th className="text-center py-2 px-2 text-sm font-medium text-emerald-700 w-20">Score</th>
                     <th className="text-center py-2 px-2 text-sm font-medium text-gray-500 w-16">Ends</th>
                     <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-20">Score</th>
                     <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Opposition Team</th>
                   </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => {
                      const getTeamDisplay = (positions, isOpposition = false) => {
                        const names = match.positionsList.map((pos) => {
                          if (isOpposition) {
                            const posKey = `${match.key}_${pos}`;
                            return oppositionPlayers[posKey] || '';
                          }
                          return getMemberName(positions[pos], `${match.key}_${pos}`);
                        });

                        if (isOpposition) {
                          return (
                            <div className="flex flex-wrap gap-1 items-center">
                              {match.positionsList.map((pos, idx) => {
                                const posKey = `${match.key}_${pos}`;
                                return (
                                  <React.Fragment key={pos}>
                                    <Input
                                      placeholder={pos}
                                      className={`h-7 ${['Skip', 'Player'].includes(pos) ? 'w-28 font-bold text-sm uppercase' : 'w-20 text-xs'}`}
                                      value={oppositionPlayers[posKey] || ''}
                                      onChange={(e) => {
                                        oppDirtyRef.current = true;
                                        setOppositionPlayers(prev => ({
                                        ...prev,
                                        [posKey]: e.target.value
                                      }));
                                      }}
                                      disabled={!canEdit}
                                    />
                                    {idx < match.positionsList.length - 1 && <span className="text-gray-300">•</span>}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div className="text-sm">
                            <span className="font-bold text-base uppercase">{names[0]}</span>
                            {names.slice(1).filter(Boolean).length > 0 && (
                              <span className="text-gray-600">, {names.slice(1).filter(Boolean).join(', ')}</span>
                            )}
                          </div>
                        );
                      };

                      return (
                        <tr key={match.key} className="border-b last:border-0">
                          <td className="py-3 px-2 w-24">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">{match.label}</span>
                              {match.badge && (
                                <Badge className={`text-xs ${match.badge === 'Home' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {match.badge}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {getTeamDisplay(match.positions, false)}
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-16 text-center h-8"
                             value={clubScores[match.key] || ''}
                             onChange={(e) => {
                               homeDirtyRef.current = true;
                               setClubScores(prev => ({
                               ...prev,
                               [match.key]: e.target.value
                             }));
                             }}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-14 text-center h-8"
                             value={ends[match.key] || ''}
                             onChange={(e) => {
                               homeDirtyRef.current = true;
                               setEnds(prev => ({
                               ...prev,
                               [match.key]: e.target.value
                             }));
                             }}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-16 text-center h-8"
                             value={oppositionScores[match.key] || ''}
                             onChange={(e) => {
                               awayDirtyRef.current = true;
                               setOppositionScores(prev => ({
                               ...prev,
                               [match.key]: e.target.value
                             }));
                             }}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                            {getTeamDisplay(match.positions, true)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canEdit && (
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setEditTeamOpen(true)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Team
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Team Dialog */}
        <Dialog open={editTeamOpen} onOpenChange={setEditTeamOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Team Selection</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {matches.map((match) => (
                <div key={match.key} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium">{isTopClub ? match.label : `Rink ${match.label}`}</span>
                    {match.badge && (
                      <Badge className={`text-xs ${match.badge === 'Home' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {match.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {match.positionsList.map((pos) => {
                      const posKey = `${match.key}_${pos}`;
                      return (
                        <div key={pos}>
                          <Label className="text-xs text-gray-500">{pos}</Label>
                          <Select
                            value={getSelectedMemberId(posKey)}
                            onValueChange={(memberId) => {
                              const member = members.find(m => m.id === memberId);
                              setEditedSelections(prev => {
                                const next = { ...prev };
                                if (member) next[posKey] = member.user_email;
                                else delete next[posKey];
                                return next;
                              });
                              setEditedNames(prev => {
                                const next = { ...prev };
                                if (member) next[posKey] = nameOf(member);
                                else delete next[posKey];
                                return next;
                              });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={`Select ${pos}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>-- None --</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {nameOf(member)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditTeamOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTeamEdit}
                  disabled={updateSelectionMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {updateSelectionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}