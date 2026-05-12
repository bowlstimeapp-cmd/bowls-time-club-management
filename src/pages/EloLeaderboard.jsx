import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, BarChart2, Shield } from 'lucide-react';
import LeaderboardRow from '@/components/elo/LeaderboardRow';
import { applyInactivityDecay } from '@/lib/eloEngine';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified Only' },
  { id: 'active', label: 'Active (90d)' },
];

export default function EloLeaderboard() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['playerElo'],
    queryFn: () => base44.entities.PlayerElo.list('-elo', 200),
    staleTime: 30000,
  });

  // Separate registered vs guest
  const registeredRecords = allRecords.filter(r => r.player_email !== null && r.player_email !== undefined && r.player_email !== '');
  const guestRecords = allRecords.filter(r => !r.player_email);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const filtered = registeredRecords.filter(r => {
    if (filter === 'verified') return r.is_verified;
    if (filter === 'active') return r.last_match_date && new Date(r.last_match_date) >= ninetyDaysAgo;
    return true;
  });

  // Apply inactivity decay to displayed ELO
  const withDecay = filtered.map(r => ({
    ...r,
    elo: applyInactivityDecay(r.elo ?? 1200, r.last_match_date),
  }));

  // Sort: ELO desc, then matches_played desc for ties
  const sorted = [...withDecay].sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo;
    return (b.matches_played || 0) - (a.matches_played || 0);
  });

  // Find own record
  const ownRecord = user ? sorted.find(r => r.player_email === user.email) : null;
  const ownRank = ownRecord ? sorted.indexOf(ownRecord) + 1 : null;

  // Build display list — own row pinned at top (if not already in top spot), then sorted list
  const displayList = sorted;

  const topElo = sorted[0]?.elo || 1200;
  const avgElo = sorted.length > 0 ? Math.round(sorted.reduce((s, r) => s + r.elo, 0) / sorted.length) : 1200;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/ScorecardHub')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Club Leaderboard</h1>
            <p className="text-xs text-gray-400">{registeredRecords.length} rated player{registeredRecords.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">ELO</span>
          </div>
        </div>

        {/* Filter pills */}
        <div className="max-w-2xl mx-auto mt-3 flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && registeredRecords.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">No ratings yet</h2>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">Ratings appear automatically after the first completed and saved match scorecard.</p>
            <button
              onClick={() => navigate('/ScorecardHub')}
              className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              Start Scoring
            </button>
          </div>
        )}

        {!isLoading && registeredRecords.length > 0 && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-black text-yellow-600">{topElo}</p>
                <p className="text-xs text-gray-400 mt-0.5">Top ELO</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-black text-emerald-600">{avgElo}</p>
                <p className="text-xs text-gray-400 mt-0.5">Avg ELO</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-black text-blue-600">{sorted.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Players</p>
              </div>
            </div>

            {/* Own row pinned highlight (if not rank 1) */}
            {ownRecord && ownRank && ownRank > 1 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Your Rating
                </p>
                <LeaderboardRow record={ownRecord} rank={ownRank} isOwnRow={true} />
              </div>
            )}

            {/* No results for filter */}
            {sorted.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No players match this filter.</p>
              </div>
            )}

            {/* Full leaderboard */}
            {sorted.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Rankings</p>
                <div className="space-y-2">
                  {displayList.map((record, i) => (
                    <LeaderboardRow
                      key={record.id}
                      record={record}
                      rank={i + 1}
                      isOwnRow={user && record.player_email === user.email}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Guest players section */}
            {guestRecords.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest Players</p>
                </div>
                <div className="space-y-2">
                  {[...guestRecords]
                    .sort((a, b) => (b.elo ?? 1200) - (a.elo ?? 1200))
                    .map((record, i) => (
                      <LeaderboardRow
                        key={record.id}
                        record={record}
                        rank={i + 1}
                        isOwnRow={false}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}