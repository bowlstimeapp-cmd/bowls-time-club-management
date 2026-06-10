/**
 * Senior Competitions page – shows rounds as large cards with optional bracket toggle
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeniorLayout from '@/components/senior/SeniorLayout';
import { Trophy, Loader2, ChevronRight, List, GitBranch } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import TournamentBracket from '@/components/tournament/TournamentBracket';

function MatchCard({ match, members }) {
  const resolveName = (email) => {
    if (!email) return 'TBD';
    const m = members.find(mb => mb.user_email === email);
    if (!m) return email;
    if (m.first_name && m.surname) return `${m.first_name} ${m.surname}`;
    return m.user_name || email;
  };

  const p1 = Array.isArray(match.player1) ? match.player1.map(resolveName).join(' & ') : resolveName(match.player1);
  const p2 = Array.isArray(match.player2) ? match.player2.map(resolveName).join(' & ') : resolveName(match.player2);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">{match.round || 'Match'}</div>
      <div className="space-y-3 mb-4">
        <div className={`p-3 rounded-xl border-2 ${match.winner === match.player1 ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
          <p className="text-lg font-bold text-gray-900">{p1}</p>
          {match.score1 !== undefined && match.score1 !== null && (
            <p className="text-base text-gray-600 font-medium">Score: {match.score1}</p>
          )}
        </div>
        <div className="text-center text-base font-bold text-gray-400">vs</div>
        <div className={`p-3 rounded-xl border-2 ${match.winner === match.player2 ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
          <p className="text-lg font-bold text-gray-900">{p2}</p>
          {match.score2 !== undefined && match.score2 !== null && (
            <p className="text-base text-gray-600 font-medium">Score: {match.score2}</p>
          )}
        </div>
      </div>
      {match.status === 'completed' && match.winner && (
        <div className="bg-emerald-100 text-emerald-800 rounded-xl p-3 font-bold text-sm">
          ✅ Winner: {Array.isArray(match.winner) ? match.winner.map(e => {
            const m = members.find(mb => mb.user_email === e);
            return (m?.first_name && m?.surname) ? `${m.first_name} ${m.surname}` : e;
          }).join(' & ') : resolveName(match.winner)}
        </div>
      )}
      {match.status !== 'completed' && (
        <div className="bg-blue-50 text-blue-700 rounded-xl p-3 font-medium text-sm">
          🕐 Yet to be played
        </div>
      )}
    </div>
  );
}

export default function SeniorCompetitions() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'bracket'

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['seniorTournaments', clubId],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId, status: 'published' }, '-created_date'),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const [user, setUser] = useState(null);
  React.useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return ms[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  // Extract matches from bracket
  function extractMatches(tournament) {
    const bracket = tournament.bracket;
    if (!bracket) return [];
    const matches = [];
    Object.entries(bracket).forEach(([round, roundMatches]) => {
      if (Array.isArray(roundMatches)) {
        roundMatches.forEach(m => matches.push({ ...m, round }));
      }
    });
    return matches;
  }

  if (selectedTournament) {
    const matches = extractMatches(selectedTournament);
    return (
      <SeniorLayout>
        <button
          onClick={() => { setSelectedTournament(null); setViewMode('list'); }}
          className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-4 min-h-[44px]"
        >
          ← Back to Competitions
        </button>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{selectedTournament.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] border-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
            >
              <List className="w-4 h-4" /> Simple View
            </button>
            <button
              onClick={() => setViewMode('bracket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] border-2 transition-colors ${viewMode === 'bracket' ? 'bg-[#1F3C5A] border-[#1F3C5A] text-white' : 'bg-white border-gray-200 text-gray-700'}`}
            >
              <GitBranch className="w-4 h-4" /> Bracket View
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          matches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-200">
              <Trophy className="w-14 h-14 mx-auto text-gray-300 mb-3" />
              <p className="text-lg text-gray-600">No matches yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((m, i) => <MatchCard key={i} match={m} members={members} />)}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 overflow-x-auto">
            <TournamentBracket
              tournament={selectedTournament}
              members={members}
              isAdmin={membership?.role === 'admin'}
              onUpdate={() => {}}
            />
          </div>
        )}
      </SeniorLayout>
    );
  }

  return (
    <SeniorLayout>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Competitions</h1>
      <p className="text-lg text-gray-600 mb-6">Club competition draws</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-lg text-gray-600">Loading competitions…</span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
          <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">No competitions published yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTournament(t)}
              className="w-full text-left bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-emerald-400 transition-colors shadow-sm min-h-[80px] flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-xl font-bold text-gray-900">{t.name}</p>
                <p className="text-base text-gray-500 capitalize">{t.comp_format || t.tournament_type} &bull; {t.tournament_type === 'knockout' ? 'Knockout' : 'Round Robin'}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </SeniorLayout>
  );
}