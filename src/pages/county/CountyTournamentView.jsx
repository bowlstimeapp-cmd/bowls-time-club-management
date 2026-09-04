import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import CountyNav from '@/components/county/CountyNav';
import { ArrowLeft, Trophy, Download, Loader2 } from 'lucide-react';
import { generateTournamentDrawPdf } from '@/lib/tournamentDrawPdf';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import { isAno } from '@/lib/tournamentAno';
import { toast } from "sonner";

export default function CountyTournamentView() {
  const [searchParams] = useSearchParams();
  const countyId = searchParams.get('countyId');
  const tournamentId = searchParams.get('tournamentId');
  const queryClient = useQueryClient();

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

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['countyTournament', tournamentId],
    queryFn: async () => { const ts = await base44.entities.CountyTournament.filter({ id: tournamentId }); return ts[0]; },
    enabled: !!tournamentId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('updateCountyData', { entity: 'CountyTournament', action: 'update', countyId, id, data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['countyTournament', tournamentId] }); },
  });

  const getMemberName = (entry) => {
    if (!entry) return '';
    return entry.split('|').map(email => {
      if (isAno(email)) return 'ANO';
      const member = affiliatedMembers.find(m => m.user_email === email);
      return member?.user_name || email;
    }).join(' / ');
  };

  const handleDownloadDraw = () => {
    if (!tournament) return;
    generateTournamentDrawPdf(tournament, county?.name || 'County', getMemberName);
  };

  const handleUpdateBracket = async (newBracket) => {
    await updateMutation.mutateAsync({ id: tournamentId, data: { bracket: newBracket } });
    toast.success('Bracket updated');
  };

  if (isLoading) {
    return <><CountyNav /><div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-8"><Skeleton className="h-12 w-64 mb-4" /><Skeleton className="h-96 w-full" /></div></>;
  }
  if (!tournament) {
    return <><CountyNav /><div className="min-h-screen flex items-center justify-center"><p>Tournament not found</p></div></>;
  }

  const formatLabel = tournament.comp_format ? tournament.comp_format.charAt(0).toUpperCase() + tournament.comp_format.slice(1) : null;

  return (
    <>
      <CountyNav />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link to={createPageUrl('CountyTournaments') + `?countyId=${countyId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Tournaments
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <Trophy className="w-8 h-8 text-amber-500" />
              <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
              {formatLabel && <Badge variant="outline" className="text-sm border-amber-300 text-amber-700 bg-amber-50">{formatLabel}</Badge>}
              {tournament.bracket && <Button variant="outline" size="sm" onClick={handleDownloadDraw} className="ml-auto"><Download className="w-4 h-4 mr-1" />Download Draw</Button>}
            </div>
            <p className="text-gray-600 mt-2">{tournament.players?.length || 0} players</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {tournament.bracket ? (
              <TournamentBracket
                bracket={tournament.bracket}
                getMemberName={getMemberName}
                onUpdateBracket={handleUpdateBracket}
                editable={false}
                scoringMode={true}
                isAdmin={canManage}
                userEmail={user?.email}
                members={affiliatedMembers}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">Draw not yet generated</div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}