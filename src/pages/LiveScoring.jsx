import React, { useState, useEffect, useMemo } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
  const { clubScores, oppositionScores, ends, oppositionPlayers, updateField, saveVenue, isSaving } = useVenueScores(selectionId, clubId, matches);

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

  const getTeamDisplay = (match, isOpposition = false) => {
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
                  onChange={(e) => updateField('opposition_players', posKey, e.target.value, venueOf(match))}
                  disabled={!canEdit}
                />
                {idx < match.positionsList.length - 1 && <span className="text-gray-300">•</span>}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    const names = match.positionsList.map((pos) => getMemberName(match.positions[pos], `${match.key}_${pos}`));
    return (
      <div className="text-sm">
        <span className="font-bold text-base uppercase">{names[0]}</span>
        {names.slice(1).filter(Boolean).length > 0 && (
          <span className="text-gray-600">, {names.slice(1).filter(Boolean).join(', ')}</span>
        )}
      </div>
    );
  };



  if (!selection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className={`max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 ${canEdit ? 'pb-28 md:pb-8' : ''}`}>
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
                  disabled={isSaving || !matches.some(match => venueOf(match) === 'away')}
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
          <Card className="mb-4 sm:mb-6 overflow-hidden sticky top-14 md:top-16 z-30 rounded-none sm:rounded-xl shadow-md">
            {scrolled ? (
              <div className="bg-emerald-800 px-3 py-2">
                <p className="text-center text-[30px] leading-none font-bold text-white tabular-nums truncate">
                  {club?.name || 'Home'} {clubTotal} – {oppositionTotal} Opposition
                </p>
              </div>
            ) : (
              <div className="bg-emerald-800 px-3 py-4 sm:p-6">
                <div className="flex items-center justify-center gap-3 sm:gap-8">
                  <div className="text-center min-w-0 flex-1">
                    <p className="text-sm font-medium text-white mb-1 truncate">{club?.name || 'Home'}</p>
                    <p className="text-[64px] leading-none font-bold text-white tabular-nums">{clubTotal}</p>
                  </div>
                  <div className="text-xl font-light text-white shrink-0">vs</div>
                  <div className="text-center min-w-0 flex-1">
                    <p className="text-sm font-medium text-white mb-1 truncate">Opposition</p>
                    <p className="text-[64px] leading-none font-bold text-white tabular-nums">{oppositionTotal}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/30 pt-2 text-center">
                  <p className="text-sm text-white">
                    Total ends: <span className="font-semibold tabular-nums">{totalEnds}</span>
                  </p>
                </div>
              </div>
            )}
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
              {/* Mobile: one card per match */}
              <div className="md:hidden space-y-3">
                {matches.map((match) => (
                  <div key={match.key} className="rounded-xl border bg-white p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {isTopClub ? match.label : `Rink ${match.label}`}
                      </span>
                      {match.badge && (
                        <Badge className={`text-xs ${match.badge === 'Home' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {match.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-3">{getTeamDisplay(match, false)}</div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Our score</p>
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          className="h-12 w-full text-center text-xl font-bold tabular-nums disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
                          value={clubScores[match.key] || ''}
                          onChange={(e) => updateField('club_scores', match.key, e.target.value, venueOf(match))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Ends</p>
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          className="h-12 w-full text-center text-xl font-bold tabular-nums disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
                          value={ends[match.key] || ''}
                          onChange={(e) => updateField('ends', match.key, e.target.value, venueOf(match))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Their score</p>
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          className="h-12 w-full text-center text-xl font-bold tabular-nums disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
                          value={oppositionScores[match.key] || ''}
                          onChange={(e) => updateField('opposition_scores', match.key, e.target.value, venueOf(match))}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Opposition team</p>
                    <div className="grid grid-cols-2 gap-2">
                      {match.positionsList.map((pos) => {
                        const posKey = `${match.key}_${pos}`;
                        return (
                          <Input
                            key={pos}
                            placeholder={pos}
                            className="h-11 w-full text-[15px] text-left disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
                            value={oppositionPlayers[posKey] || ''}
                            onChange={(e) => updateField('opposition_players', posKey, e.target.value, venueOf(match))}
                            disabled={!canEdit}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
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
                            {getTeamDisplay(match, false)}
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-16 text-center h-8"
                             value={clubScores[match.key] || ''}
                             onChange={(e) => updateField('club_scores', match.key, e.target.value, venueOf(match))}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-14 text-center h-8"
                             value={ends[match.key] || ''}
                             onChange={(e) => updateField('ends', match.key, e.target.value, venueOf(match))}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                           <Input
                             type="number"
                             min="0"
                             className="w-16 text-center h-8"
                             value={oppositionScores[match.key] || ''}
                             onChange={(e) => updateField('opposition_scores', match.key, e.target.value, venueOf(match))}
                             disabled={!canEdit}
                           />
                          </td>
                          <td className="py-3 px-2">
                            {getTeamDisplay(match, true)}
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