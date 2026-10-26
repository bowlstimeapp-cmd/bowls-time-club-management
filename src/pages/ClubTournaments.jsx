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
  Trash2,
  Download,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateTournamentDrawPdf } from '@/lib/tournamentDrawPdf';
import { isAno } from '@/lib/tournamentAno';
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

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
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
  const [activeTab, setActiveTab] = useState('published');

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('updateClubData', { entity: 'ClubTournament', action: 'delete', clubId, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', clubId] });
      toast.success('Tournament deleted');
      setDeleteId(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, is_archived }) => base44.functions.invoke('updateClubData', { entity: 'ClubTournament', action: 'update', clubId, id, data: { is_archived } }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', clubId] });
      toast.success(vars.is_archived ? 'Tournament archived' : 'Tournament restored');
    },
    onError: () => toast.error('Failed to update tournament'),
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const isPlatformAdminUser = user?.role === 'admin';
  const canArchive = isClubAdmin || isPlatformAdminUser;

  const getMemberName = (entry) => {
    if (!entry) return '';
    return entry.split('|').map(email => {
      if (isAno(email)) return 'ANO';
      const m = members.find(x => x.user_email === email);
      return m?.user_name || email;
    }).join(' / ');
  };

  const handleDownloadDraw = (tournament) => {
    generateTournamentDrawPdf(tournament, club?.name || 'Club', getMemberName);
  };

  const publishedTournaments = tournaments.filter(t => t.status === 'published' && !t.is_archived);
  const draftTournaments = tournaments.filter(t => t.status === 'draft' && !t.is_archived);
  const archivedTournaments = canArchive ? tournaments.filter(t => t.is_archived) : [];

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
                        <div className="flex gap-2 flex-wrap">
                          <Link to={createPageUrl('TournamentView') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link to={createPageUrl('TournamentEditor') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          {tournament.bracket && (
                            <Button variant="outline" size="sm" onClick={() => handleDownloadDraw(tournament)}>
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(tournament.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {canArchive && (
              <TabsList className="mb-3">
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="archived">Archived{archivedTournaments.length > 0 ? ` (${archivedTournaments.length})` : ''}</TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="published" className="mt-0">
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
                          <div className="flex gap-2 flex-wrap">
                            <Link to={createPageUrl('TournamentView') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            {tournament.bracket && (
                              <Button variant="outline" size="sm" onClick={() => handleDownloadDraw(tournament)}>
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            )}
                            {isClubAdmin && (
                              <>
                                <Link to={createPageUrl('TournamentEditor') + `?clubId=${clubId}&tournamentId=${tournament.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                </Link>
                                <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: tournament.id, is_archived: true })}>
                                  <Archive className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(tournament.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            {canArchive && (
              <TabsContent value="archived" className="mt-0">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Archived Tournaments</h2>
                {archivedTournaments.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No archived tournaments</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {archivedTournaments.map(tournament => (
                      <Card key={tournament.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-600">{tournament.name}</p>
                                <p className="text-sm text-gray-500">
                                  {tournament.players?.length || 0} players
                                </p>
                              </div>
                              <Badge variant="secondary">Archived</Badge>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: tournament.id, is_archived: false })}>
                                <ArchiveRestore className="w-4 h-4 mr-1" />
                                Unarchive
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(tournament.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this tournament. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}