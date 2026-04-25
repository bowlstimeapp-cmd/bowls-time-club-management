import React, { useState, useEffect } from 'react';
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
    if (matchScore) {
      setOppositionPlayers(matchScore.opposition_players || {});
      setClubScores(matchScore.club_scores || {});
      setOppositionScores(matchScore.opposition_scores || {});
      setEnds(matchScore.ends || {});
    }
  }, [matchScore]);

  useEffect(() => {
    if (selection?.selections) {
      setEditedSelections(selection.selections);
    }
  }, [selection]);

  const createScoreMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchScore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchScore', selectionId] });
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MatchScore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchScore', selectionId] });
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
      data: { selections: editedSelections }
    });
  };

  const canEdit = membership?.role === 'admin' || membership?.role === 'live_scorer' || membership?.role === 'selector';

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    if (member?.first_name && member?.surname) {
      return `${member.first_name} ${member.surname}`;
    }
    return member?.user_name || email || 'TBD';
  };

  const handleSave = async () => {
    const data = {
      selection_id: selectionId,
      club_id: clubId,
      opposition_players: oppositionPlayers,
      club_scores: clubScores,
      opposition_scores: oppositionScores,
      ends: ends,
    };

    if (matchScore) {
      await updateScoreMutation.mutateAsync({ id: matchScore.id, data });
    } else {
      await createScoreMutation.mutateAsync(data);
    }
  };

  const isSaving = createScoreMutation.isPending || updateScoreMutation.isPending;

  // Calculate totals
  const calculateTotal = (scores) => {
    return Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
  };

  const clubTotal = calculateTotal(clubScores);
  const oppositionTotal = calculateTotal(oppositionScores);
  const totalEnds = calculateTotal(ends);

  // Build rinks from selection - check all possible rinks 1-6
  const getRinks = () => {
    if (!selection?.selections) return [];
    const rinks = [];
    const homeRinksCount = selection.home_rinks || 2;
    
    // Check all possible rink numbers 1-6 to find which ones have players assigned
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
        rinks.push({ 
          number: rinkNum, 
          positions: rinkPositions,
          isHome: rinks.length < homeRinksCount
        });
      }
    }
    return rinks;
  };

  const rinks = getRinks();

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
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Scores
              </Button>
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
              <CardTitle className="text-lg">Rink Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-500 w-24">Rink</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-emerald-700">{club?.name || 'Club'} Team</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-emerald-700 w-20">Score</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-500 w-16">Ends</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-20">Score</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Opposition Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rinks.map((rink) => {
                      const getTeamDisplay = (positions, isOpposition = false) => {
                        const names = POSITIONS.map((pos, idx) => {
                          if (isOpposition) {
                            const posKey = `rink${rink.number}_${pos}`;
                            return oppositionPlayers[posKey] || '';
                          }
                          return getMemberName(positions[pos]);
                        });
                        
                        if (isOpposition) {
                          return (
                            <div className="flex flex-wrap gap-1 items-center">
                              {POSITIONS.map((pos, idx) => {
                                const posKey = `rink${rink.number}_${pos}`;
                                return (
                                  <React.Fragment key={pos}>
                                    <Input
                                      placeholder={pos}
                                      className={`h-7 ${pos === 'Skip' ? 'w-28 font-bold text-sm uppercase' : 'w-20 text-xs'}`}
                                      value={oppositionPlayers[posKey] || ''}
                                      onChange={(e) => setOppositionPlayers(prev => ({
                                        ...prev,
                                        [posKey]: e.target.value
                                      }))}
                                      disabled={!canEdit}
                                    />
                                    {idx < POSITIONS.length - 1 && <span className="text-gray-300">•</span>}
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
                        <tr key={rink.number} className="border-b last:border-0">
                          <td className="py-3 px-2 w-24">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">{rink.number}</span>
                              <Badge className={`text-xs ${rink.isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {rink.isHome ? 'Home' : 'Away'}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {getTeamDisplay(rink.positions, false)}
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              min="0"
                              className="w-14 text-center h-8"
                              value={ends[`rink${rink.number}`] || ''}
                              onChange={(e) => setEnds(prev => ({
                                ...prev,
                                [`rink${rink.number}`]: e.target.value
                              }))}
                              disabled={!canEdit}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center h-8"
                              value={clubScores[`rink${rink.number}`] || ''}
                              onChange={(e) => setClubScores(prev => ({
                                ...prev,
                                [`rink${rink.number}`]: e.target.value
                              }))}
                              disabled={!canEdit}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center h-8"
                              value={oppositionScores[`rink${rink.number}`] || ''}
                              onChange={(e) => setOppositionScores(prev => ({
                                ...prev,
                                [`rink${rink.number}`]: e.target.value
                              }))}
                              disabled={!canEdit}
                            />
                          </td>
                          <td className="py-3 px-2">
                            {getTeamDisplay(rink.positions, true)}
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
              {rinks.map((rink) => (
                <div key={rink.number} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium">Rink {rink.number}</span>
                    <Badge className={`text-xs ${rink.isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rink.isHome ? 'Home' : 'Away'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {POSITIONS.map((pos) => {
                      const posKey = `rink${rink.number}_${pos}`;
                      return (
                        <div key={pos}>
                          <Label className="text-xs text-gray-500">{pos}</Label>
                          <Select
                            value={editedSelections[posKey] || ''}
                            onValueChange={(value) => {
                              setEditedSelections(prev => ({
                                ...prev,
                                [posKey]: value || undefined
                              }));
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={`Select ${pos}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>-- None --</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.user_email} value={member.user_email}>
                                  {member.first_name && member.surname 
                                    ? `${member.first_name} ${member.surname}`
                                    : member.user_name || member.user_email}
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