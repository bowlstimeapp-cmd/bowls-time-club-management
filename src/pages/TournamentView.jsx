import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import { toast } from "sonner";

export default function TournamentView() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const tournamentId = searchParams.get('tournamentId');
  const navigate = useNavigate();

  useEffect(() => {
    if (!clubId || !tournamentId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, tournamentId, navigate]);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      const tournaments = await base44.entities.ClubTournament.filter({ id: tournamentId });
      return tournaments[0];
    },
    enabled: !!tournamentId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
          </div>
          <p className="text-gray-600 mt-2">
            {tournament.players?.length || 0} players
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {tournament.bracket ? (
            <TournamentBracket 
              bracket={tournament.bracket} 
              getMemberName={getMemberName}
              editable={false}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              Draw not yet generated
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}