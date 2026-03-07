import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Eye, 
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SelectionCard from '@/components/selection/SelectionCard';
import SelectionTableView from '@/components/selection/SelectionTableView';

export default function Selection() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('published');
  const [competitionFilter, setCompetitionFilter] = useState('all');

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

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ['selections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId }, '-created_date'),
    enabled: !!clubId,
  });

  const { data: myAvailabilities = [] } = useQuery({
    queryKey: ['myAvailabilities', clubId, user?.email],
    queryFn: () => base44.entities.MemberAvailability.filter({ 
      club_id: clubId, 
      user_email: user.email 
    }),
    enabled: !!clubId && !!user?.email,
  });

  const { data: allAvailabilities = [] } = useQuery({
    queryKey: ['allAvailabilities', clubId],
    queryFn: () => base44.entities.MemberAvailability.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
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

  const setAvailabilityMutation = useMutation({
    mutationFn: async ({ selectionId, isAvailable }) => {
      const existing = myAvailabilities.find(a => a.selection_id === selectionId);
      if (existing) {
        return base44.entities.MemberAvailability.update(existing.id, { is_available: isAvailable });
      } else {
        return base44.entities.MemberAvailability.create({
          club_id: clubId,
          selection_id: selectionId,
          user_email: user.email,
          is_available: isAvailable
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvailabilities'] });
      queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
    },
  });

  const deleteSelectionMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamSelection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      toast.success('Selection deleted');
    },
  });

  const isSelector = membership?.role === 'selector' || membership?.role === 'admin';

  // Check if user is selected for a match
  const isUserSelectedForMatch = (selection) => {
    if (!selection.selections || !user?.email) return false;
    return Object.values(selection.selections).includes(user.email);
  };

  // Filter selections based on competition type
  const filterByCompetition = (selectionsList) => {
    if (competitionFilter === 'all') return selectionsList;
    return selectionsList.filter(s => s.competition === competitionFilter);
  };

  const publishedSelections = useMemo(() => 
    filterByCompetition(selections.filter(s => s.status === 'published')),
    [selections, competitionFilter]
  );
  
  const draftSelections = useMemo(() => 
    filterByCompetition(selections.filter(s => s.status === 'draft')),
    [selections, competitionFilter]
  );
  
  const mySelections = useMemo(() => 
    filterByCompetition(selections.filter(s => s.status === 'published' && isUserSelectedForMatch(s))),
    [selections, competitionFilter, user?.email]
  );

  // Get unique competition types from selections
  const competitionTypes = useMemo(() => {
    const types = [...new Set(selections.map(s => s.competition).filter(Boolean))];
    return types;
  }, [selections]);

  const getMyAvailability = (selectionId) => {
    const availability = myAvailabilities.find(a => a.selection_id === selectionId);
    return availability?.is_available;
  };

  const getAvailabilityForSelection = (selectionId) => {
    return allAvailabilities.filter(a => a.selection_id === selectionId);
  };

  const handleDeleteSelection = (selectionId) => {
    if (confirm('Are you sure you want to delete this selection?')) {
      deleteSelectionMutation.mutate(selectionId);
    }
  };

  const EmptyState = ({ title, description }) => (
    <div className="text-center py-12">
      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );

  if (!clubId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Team Selection
            </h1>
            <p className="text-gray-600">
              {club?.name} • View team selections and set your availability
            </p>
          </div>
          {isSelector && (
            <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                New Selection
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Competition Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by competition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Competitions</SelectItem>
                {competitionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full mb-6 h-auto ${isSelector ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="published" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Published ({publishedSelections.length})
              </TabsTrigger>
              <TabsTrigger value="myselections" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Matches ({mySelections.length})
              </TabsTrigger>
              {isSelector && (
                <TabsTrigger value="drafts" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Drafts ({draftSelections.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="published">
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
              ) : publishedSelections.length > 0 ? (
                club?.alt_view_selection ? (
                  <SelectionTableView
                    selections={publishedSelections}
                    isSelector={isSelector}
                    clubId={clubId}
                    getMyAvailability={getMyAvailability}
                    onSetAvailability={(selectionId, isAvailable) =>
                      setAvailabilityMutation.mutate({ selectionId, isAvailable })
                    }
                    isSettingAvailability={setAvailabilityMutation.isPending}
                    onDelete={handleDeleteSelection}
                  />
                ) : (
                  <div className="space-y-4">
                    {publishedSelections.map(selection => (
                      <SelectionCard
                        key={selection.id}
                        selection={selection}
                        isSelector={isSelector}
                        clubId={clubId}
                        myAvailability={getMyAvailability(selection.id)}
                        onSetAvailability={(isAvailable) =>
                          setAvailabilityMutation.mutate({ selectionId: selection.id, isAvailable })
                        }
                        isSettingAvailability={setAvailabilityMutation.isPending}
                        availabilities={getAvailabilityForSelection(selection.id)}
                        members={members}
                        onDelete={handleDeleteSelection}
                      />
                    ))}
                  </div>
                )
              ) : (
                <EmptyState title="No published selections" description="Team selections will appear here once published" />
              )}
            </TabsContent>

            <TabsContent value="myselections">
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
              ) : mySelections.length > 0 ? (
                club?.alt_view_selection ? (
                  <SelectionTableView
                    selections={mySelections}
                    isSelector={isSelector}
                    clubId={clubId}
                    getMyAvailability={getMyAvailability}
                    onSetAvailability={(selectionId, isAvailable) =>
                      setAvailabilityMutation.mutate({ selectionId, isAvailable })
                    }
                    isSettingAvailability={setAvailabilityMutation.isPending}
                    onDelete={handleDeleteSelection}
                  />
                ) : (
                  <div className="space-y-4">
                    {mySelections.map(selection => (
                      <SelectionCard
                        key={selection.id}
                        selection={selection}
                        isSelector={isSelector}
                        clubId={clubId}
                        myAvailability={getMyAvailability(selection.id)}
                        onSetAvailability={(isAvailable) =>
                          setAvailabilityMutation.mutate({ selectionId: selection.id, isAvailable })
                        }
                        isSettingAvailability={setAvailabilityMutation.isPending}
                        availabilities={getAvailabilityForSelection(selection.id)}
                        members={members}
                        onDelete={handleDeleteSelection}
                      />
                    ))}
                  </div>
                )
              ) : (
                <EmptyState title="No matches found" description="You haven't been selected for any matches yet" />
              )}
            </TabsContent>

            {isSelector && (
              <TabsContent value="drafts">
                {isLoading ? (
                  <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
                ) : draftSelections.length > 0 ? (
                  club?.alt_view_selection ? (
                    <SelectionTableView
                      selections={draftSelections}
                      isSelector={isSelector}
                      clubId={clubId}
                      getMyAvailability={() => undefined}
                      onDelete={handleDeleteSelection}
                    />
                  ) : (
                    <div className="space-y-4">
                      {draftSelections.map(selection => (
                        <SelectionCard
                          key={selection.id}
                          selection={selection}
                          isSelector={isSelector}
                          clubId={clubId}
                          onDelete={handleDeleteSelection}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <EmptyState title="No draft selections" description="Create a new selection to get started" />
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}