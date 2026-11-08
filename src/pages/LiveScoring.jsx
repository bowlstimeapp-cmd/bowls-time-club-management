import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import { format, parseISO, isToday } from 'date-fns';

import scoringMatches from '@/components/scoring/scoringMatches';
import useVenueScores from '@/components/scoring/useVenueScores';
import { venueOf } from '@/components/scoring/venueScoreData';

export default function LiveScoring() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const selectionId = searchParams.get('selectionId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editedSelections, setEditedSelections] = useState({});
  const [editedNames, setEditedNames] = useState({});

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

  const matches = useMemo(() => scoringMatches(selection), [selection]);
  const { clubScores, oppositionScores, ends, oppositionPlayers, updateField, saveVenue, savePlayers, hasUnsavedPlayers, isSaving } = useVenueScores(selectionId, clubId, matches);

  useEffect(() => {
    if (selection?.selections) {
      setEditedSelections(selection.selections);
      setEditedNames(selection.selection_names || {});
    }
  }, [selection]);



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
  // Prefer the opponent saved in the selection; fall back to the match name (minus any "vs ") for older selections
  const opponentName = selection?.opponent?.trim()
    || selection?.match_name?.replace(/^\s*(vs\.?|v)\s+/i, '').trim()
    || 'Opposition';

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

  const handleSaveHome = () => saveVenue('home');
  const handleSaveAway = () => saveVenue('away');

  // Calculate totals
  const calculateTotal = (scores) => {
    return Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
  };

  const clubTotal = calculateTotal(clubScores);
  const oppositionTotal = calculateTotal(oppositionScores);
  const totalEnds = calculateTotal(ends);

  if (!selection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 ${canEdit ? 'pb-28 md:pb-8' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link 
            to={createPageUrl('Selection') + `?clubId=${clubId}`}
            className="inline-flex items-center min-h-[44px] text-gray-600 hover:text-gray-900 mb-1 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Live Scoring</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-gray-600">
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
              <div className="hidden md:flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveHome}
                  disabled={isSaving || !matches.some(match => venueOf(match) === 'home')}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
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
                  disabled={isSaving || !matches.some(match => venueOf(match) === 'away')}
                  variant="outline"
                  className="min-h-[44px] border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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

        {/* Live scoring totals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-800 px-4 py-5 sm:px-8 sm:py-6 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/90 mb-1 truncate">
                  {club?.name || 'Your club'}
                </p>
                <p className="text-[60px] leading-none font-bold text-white tabular-nums">{clubTotal}</p>
              </div>
              <div className="text-center min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/90 mb-1 truncate">{opponentName}</p>
                <p className="text-[60px] leading-none font-bold text-white tabular-nums">{oppositionTotal}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/20 pt-3 text-center">
              <p className="text-sm font-medium text-white/90">
                Total ends played: <span className="font-bold tabular-nums text-white">{totalEnds}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Rink scoreboards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{isTopClub ? 'Match Scores' : 'Rink Scores'}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {matches.map((match) => {
              const clubVal = parseInt(clubScores[match.key]) || 0;
              const oppVal = parseInt(oppositionScores[match.key]) || 0;
              const clubLeading = clubVal > oppVal;
              const oppLeading = oppVal > clubVal;
              const rinkName = isTopClub ? match.label : `Rink ${match.label}`;

              return (
                <div key={match.key} className="rounded-3xl bg-white shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-900/10">
                  {/* Scoreboard panel */}
                  <div className="rounded-t-3xl bg-gradient-to-b from-emerald-700 to-emerald-800 px-3 pt-3 pb-4 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-widest text-white truncate">{rinkName}</span>
                      {match.badge && (
                        <Badge className={`text-xs ${match.badge === 'Home' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {match.badge}
                        </Badge>
                      )}
                      {isToday(parseISO(selection.match_date)) && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                          ● LIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 items-end gap-2">
                      <div className="text-center min-w-0">
                        <p className="mb-1 flex min-h-[2rem] items-end justify-center text-xs font-semibold uppercase tracking-wide leading-tight text-white/90">
                          {club?.name || 'Your club'}
                        </p>
                        {canEdit ? (
                          <Input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            aria-label={`${rinkName} club score`}
                            className={`h-[76px] lg:h-[92px] w-full rounded-2xl border border-white/30 bg-white/10 px-0 py-0 text-center text-[60px] lg:text-[76px] leading-none font-bold text-white tabular-nums focus-visible:ring-2 focus-visible:ring-white/70 ${oppLeading ? 'opacity-70' : ''}`}
                            value={clubScores[match.key] || ''}
                            onChange={(e) => updateField('club_scores', match.key, e.target.value, venueOf(match))}
                            disabled={!canEdit}
                          />
                        ) : (
                          <p className={`text-[60px] lg:text-[76px] leading-none font-bold text-white tabular-nums ${oppLeading ? 'opacity-70' : ''}`}>
                            {clubScores[match.key] || '–'}
                          </p>
                        )}
                        <div className={`mx-auto mt-2 h-1 w-10 rounded-full ${clubLeading ? 'bg-white' : 'bg-transparent'}`} />
                      </div>

                      <div className="text-center min-w-0">
                        <p className="mb-1 flex min-h-[2rem] items-end justify-center text-xs font-semibold uppercase tracking-wide leading-tight text-white/90">
                          Ends
                        </p>
                        {canEdit ? (
                          <Input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            aria-label={`${rinkName} ends`}
                            className="h-[76px] lg:h-[92px] w-full rounded-2xl border border-white/30 bg-white/10 px-0 py-0 text-center text-[40px] lg:text-[50px] leading-none font-bold text-white tabular-nums focus-visible:ring-2 focus-visible:ring-white/70"
                            value={ends[match.key] || ''}
                            onChange={(e) => updateField('ends', match.key, e.target.value, venueOf(match))}
                            disabled={!canEdit}
                          />
                        ) : (
                          <p className="flex h-[76px] lg:h-[92px] items-center justify-center text-[40px] lg:text-[50px] leading-none font-bold text-white tabular-nums">
                            {ends[match.key] || '–'}
                          </p>
                        )}
                        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-transparent" />
                      </div>

                      <div className="text-center min-w-0">
                        <p className="mb-1 flex min-h-[2rem] items-end justify-center text-xs font-semibold uppercase tracking-wide leading-tight text-white/90">
                          {opponentName}
                        </p>
                        {canEdit ? (
                          <Input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            aria-label={`${rinkName} ${opponentName} score`}
                            className={`h-[76px] lg:h-[92px] w-full rounded-2xl border border-white/30 bg-white/10 px-0 py-0 text-center text-[60px] lg:text-[76px] leading-none font-bold text-white tabular-nums focus-visible:ring-2 focus-visible:ring-white/70 ${clubLeading ? 'opacity-70' : ''}`}
                            value={oppositionScores[match.key] || ''}
                            onChange={(e) => updateField('opposition_scores', match.key, e.target.value, venueOf(match))}
                            disabled={!canEdit}
                          />
                        ) : (
                          <p className={`text-[60px] lg:text-[76px] leading-none font-bold text-white tabular-nums ${clubLeading ? 'opacity-70' : ''}`}>
                            {oppositionScores[match.key] || '–'}
                          </p>
                        )}
                        <div className={`mx-auto mt-2 h-1 w-10 rounded-full ${oppLeading ? 'bg-white' : 'bg-transparent'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Player area */}
                  <div className="rounded-b-3xl border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 truncate">Your club players</p>
                        {match.positionsList.map((pos) => (
                          <div key={pos} className="flex items-center justify-between gap-2 h-10 border-b border-gray-100 last:border-0">
                            <span className="text-[15px] font-semibold text-gray-900 truncate">
                              {getMemberName(match.positions[pos], `${match.key}_${pos}`)}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">{pos}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 truncate">{opponentName} players</p>
                        {match.positionsList.map((pos) => {
                          const posKey = `${match.key}_${pos}`;
                          return (
                            <div key={pos} className="flex items-center justify-between gap-2 h-10 border-b border-gray-100 last:border-0">
                              {canEdit ? (
                                <Input
                                  placeholder="Add name"
                                  aria-label={`${rinkName} ${opponentName} ${pos}`}
                                  className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-[15px] font-semibold text-gray-900 shadow-none placeholder:font-normal placeholder:text-gray-400 focus-visible:ring-0"
                                  value={oppositionPlayers[posKey] || ''}
                                  onChange={(e) => updateField('opposition_players', posKey, e.target.value, venueOf(match))}
                                  disabled={!canEdit}
                                />
                              ) : (
                                <span className="text-[15px] font-semibold text-gray-900 truncate">
                                  {oppositionPlayers[posKey] || '—'}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 shrink-0">{pos}</span>
                            </div>
                          );
                        })}
                        {canEdit && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full min-h-[40px] border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => savePlayers(venueOf(match))}
                            disabled={isSaving || !hasUnsavedPlayers(venueOf(match))}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save {opponentName} players
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {canEdit && (
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => setEditTeamOpen(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Team
              </Button>
            </div>
          )}
        </motion.div>

        {/* Mobile save bar */}
        {canEdit && (
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 flex gap-2"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <Button
              onClick={handleSaveHome}
              disabled={isSaving || !matches.some(match => venueOf(match) === 'home')}
              className="flex-1 h-[52px] bg-emerald-600 hover:bg-emerald-700"
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
              disabled={isSaving || !matches.some(match => venueOf(match) === 'away')}
              variant="outline"
              className="flex-1 h-[52px] border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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