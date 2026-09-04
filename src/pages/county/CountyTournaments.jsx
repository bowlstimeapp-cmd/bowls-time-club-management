import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CountyNav from '@/components/county/CountyNav';
import { Plus, Trophy, Eye, Pencil, Trash2, Download, Loader2 } from 'lucide-react';
import { generateTournamentDrawPdf } from '@/lib/tournamentDrawPdf';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CountyTournaments() {
  const [searchParams] = useSearchParams();
  const countyId = searchParams.get('countyId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: county } = useQuery({
    queryKey: ['county', countyId],
    queryFn: async () => { const r = await base44.entities.County.filter({ id: countyId }); return r[0]; },
    enabled: !!countyId,
  });
  const { data: affData } = useQuery({
    queryKey: ['countyAffiliated', countyId],
    queryFn: async () => { const res = await base44.functions.invoke('getCountyAffiliatedMembers', { countyId }); return res.data; },
    enabled: !!countyId,
  });

  const affiliatedMembers = (affData?.approved || []).map(m => ({ user_email: m.email, user_name: m.name }));
  const isPlatformAdmin = user?.role === 'admin';
  const myEntry = affData?.approved?.find(m => m.email === user?.email);
  const canManage = isPlatformAdmin || myEntry?.role === 'admin' || myEntry?.role === 'secretary';

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['countyTournaments', countyId],
    queryFn: () => base44.entities.CountyTournament.filter({ county_id: countyId }, '-created_date'),
    enabled: !!countyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('updateCountyData', { entity: 'CountyTournament', action: 'delete', countyId, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countyTournaments', countyId] });
      toast.success('Tournament deleted');
      setDeleteId(null);
    },
  });

  const getMemberName = (entry) => {
    if (!entry) return '';
    return entry.split('|').map(email => {
      const m = affiliatedMembers.find(x => x.user_email === email);
      return m?.user_name || email;
    }).join(' / ');
  };

  const handleDownloadDraw = (tournament) => {
    generateTournamentDrawPdf(tournament, county?.name || 'County', getMemberName);
  };

  const publishedTournaments = tournaments.filter(t => t.status === 'published');
  const draftTournaments = tournaments.filter(t => t.status === 'draft');

  if (!countyId) return <><CountyNav /><div className="p-8 text-center text-gray-500">No county selected.</div></>;

  return (
    <>
      <CountyNav />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">County Competitions</h1>
              <p className="text-gray-600">{county?.name} • Tournaments and competitions</p>
            </div>
            {canManage && (
              <Link to={createPageUrl('CountyTournamentEditor') + `?countyId=${countyId}`}>
                <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />Create Knockout</Button>
              </Link>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            {canManage && draftTournaments.length > 0 && (
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
                              <p className="text-sm text-gray-500">{tournament.players?.length || 0} players</p>
                            </div>
                            <Badge variant="secondary">Draft</Badge>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Link to={createPageUrl('CountyTournamentView') + `?countyId=${countyId}&tournamentId=${tournament.id}`}><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button></Link>
                            <Link to={createPageUrl('CountyTournamentEditor') + `?countyId=${countyId}&tournamentId=${tournament.id}`}><Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-1" />Edit</Button></Link>
                            {tournament.bracket && <Button variant="outline" size="sm" onClick={() => handleDownloadDraw(tournament)}><Download className="w-4 h-4 mr-1" />PDF</Button>}
                            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(tournament.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
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
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : publishedTournaments.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No tournaments published yet</p></CardContent></Card>
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
                              <p className="text-sm text-gray-500">{tournament.players?.length || 0} players</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Link to={createPageUrl('CountyTournamentView') + `?countyId=${countyId}&tournamentId=${tournament.id}`}><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button></Link>
                            {tournament.bracket && <Button variant="outline" size="sm" onClick={() => handleDownloadDraw(tournament)}><Download className="w-4 h-4 mr-1" />PDF</Button>}
                            {canManage && (
                              <>
                                <Link to={createPageUrl('CountyTournamentEditor') + `?countyId=${countyId}&tournamentId=${tournament.id}`}><Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-1" />Edit</Button></Link>
                                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteId(tournament.id)}><Trash2 className="w-4 h-4" /></Button>
                              </>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this tournament. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}