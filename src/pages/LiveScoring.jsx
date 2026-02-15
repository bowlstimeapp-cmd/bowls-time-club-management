import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, Trophy, Calendar } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';

const POSITIONS = ['Lead', '2', '3', 'Skip'];

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
    }
  }, [matchScore]);

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

  // Build rinks from selection
  const getRinks = () => {
    if (!selection?.selections) return [];
    const rinks = [];
    const selectedRinks = selection.selected_rinks?.map(r => parseInt(r)) || [1, 2];
    
    for (const rinkNum of selectedRinks) {
      const rinkPositions = {};
      for (const pos of POSITIONS) {
        const key = `rink${rinkNum}_${pos}`;
        rinkPositions[pos] = selection.selections[key];
      }
      rinks.push({ number: rinkNum, positions: rinkPositions });
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
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
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

        {/* Rinks Scoring */}
        <div className="space-y-6">
          {rinks.map((rink, index) => (
            <motion.div
              key={rink.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Rink {rink.number}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 text-sm font-medium text-gray-500 w-20">Position</th>
                          <th className="text-left py-2 px-2 text-sm font-medium text-emerald-700">{club?.name || 'Club'}</th>
                          <th className="text-center py-2 px-2 text-sm font-medium text-emerald-700 w-20">Score</th>
                          <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-20">Score</th>
                          <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Opposition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {POSITIONS.map((pos) => {
                          const posKey = `rink${rink.number}_${pos}`;
                          return (
                            <tr key={pos} className="border-b last:border-0">
                              <td className="py-3 px-2 text-sm font-medium text-gray-600">{pos}</td>
                              <td className="py-3 px-2 text-sm text-gray-900">
                                {getMemberName(rink.positions[pos])}
                              </td>
                              <td className="py-3 px-2">
                                {pos === 'Skip' && (
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
                                )}
                              </td>
                              <td className="py-3 px-2">
                                {pos === 'Skip' && (
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
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <Input
                                  placeholder={`Opposition ${pos}`}
                                  className="h-8"
                                  value={oppositionPlayers[posKey] || ''}
                                  onChange={(e) => setOppositionPlayers(prev => ({
                                    ...prev,
                                    [posKey]: e.target.value
                                  }))}
                                  disabled={!canEdit}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}