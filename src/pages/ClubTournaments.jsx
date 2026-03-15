import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Trophy,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
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
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClubTournaments() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', clubId],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId }, '-created_date'),
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

  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubTournament.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', clubId] });
      toast.success('Tournament deleted');
      setDeleteId(null);
    },
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const publishedTournaments = tournaments.filter(t => t.status === 'published');
  const draftTournaments = tournaments.filter(t => t.status === 'draft');

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
              Club Competitions
            </h1>
            <p className="text-gray-600">
              {club?.name} • Tournaments and competitions
            </p>
          </div>
          {isClubAdmin && (
            <div className="flex gap-2">
              <Link to={createPageUrl('TournamentEditor') + `?clubId=${clubId}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Knockout
                </Button>
              </Link>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {isClubAdmin && draftTournaments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Drafts</h2>
              <div className="space-y-3">
                {draftTournaments.map(tournament => (
                  <Card key={tournament.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <div>
                            <p className="font-medium">{tournament.name}</p>
                            <p className="text-sm text-gray-500">
                              {tournament.players?.length || 0} players
                            </p>
                          </div>
                          <Badge variant="secondary">Draft</Badge>
                        </div>
                        <Link to={createPageUrl('TournamentEditor') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Published Tournaments</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : publishedTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No tournaments published yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {publishedTournaments.map(tournament => (
                  <Card key={tournament.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <div>
                            <p className="font-medium">{tournament.name}</p>
                            <p className="text-sm text-gray-500">
                              {tournament.players?.length || 0} players
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={createPageUrl('TournamentView') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {isClubAdmin && (
                            <Link to={createPageUrl('TournamentEditor') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                              <Button variant="outline" size="sm">
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}