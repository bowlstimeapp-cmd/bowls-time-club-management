import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, Plus, Search, BookOpen, X, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

function generateMatchCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function ScorecardHub() {
  const [user, setUser] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: savedScorecards = [], isLoading: savedLoading } = useQuery({
    queryKey: ['savedScorecards', user?.email],
    queryFn: () => base44.entities.Scorecard.filter({ saved_by: user.email }),
    enabled: !!user?.email && showSaved,
  });

  const displayName = user
    ? (user.first_name ? `${user.first_name}${user.surname ? ' ' + user.surname : ''}` : user.full_name || user.email?.split('@')[0])
    : '';

  const handleNewScorecard = async () => {
    setCreating(true);
    const code = generateMatchCode();
    const sc = await base44.entities.Scorecard.create({
      match_code: code,
      home_player: displayName,
      home_player_email: user.email,
      away_player: '',
      away_player_email: '',
      home_scores: Array(25).fill(''),
      away_scores: Array(25).fill(''),
      saved_by: [user.email],
    });
    setCreating(false);
    navigate(`/ScorecardDetail?id=${sc.id}&role=home`);
  };

  const handleJoin = async () => {
    if (joinCode.length !== 6) { toast.error('Please enter a 6-digit code'); return; }
    setJoining(true);
    const results = await base44.entities.Scorecard.filter({ match_code: joinCode });
    setJoining(false);
    if (!results.length) { toast.error('No scorecard found with that code'); return; }
    const sc = results[0];
    // Add this user as away player if not set
    if (!sc.away_player_email) {
      await base44.entities.Scorecard.update(sc.id, {
        away_player: displayName,
        away_player_email: user.email,
        saved_by: [...(sc.saved_by || []), user.email],
      });
    }
    setShowJoin(false);
    navigate(`/ScorecardDetail?id=${sc.id}&role=away`);
  };

  const getOpponent = (sc) => {
    if (sc.home_player_email === user?.email) return sc.away_player || 'Awaiting opponent';
    return sc.home_player || 'Unknown';
  };

  const getScore = (sc) => {
    const homeTotal = (sc.home_scores || []).reduce((s, v) => s + (parseInt(v) || 0), 0);
    const awayTotal = (sc.away_scores || []).reduce((s, v) => s + (parseInt(v) || 0), 0);
    return `${homeTotal} – ${awayTotal}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-600 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecard</h1>
          {displayName && (
            <p className="text-gray-500 mt-1">Welcome, <span className="font-medium text-gray-700">{displayName}</span></p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNewScorecard}
            disabled={creating || !user}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-emerald-400 hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Start New Scorecard</p>
              <p className="text-xs text-gray-500 mt-0.5">Generate a code and share with your opponent</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>

          <button
            onClick={() => setShowJoin(true)}
            disabled={!user}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Join Existing Match</p>
              <p className="text-xs text-gray-500 mt-0.5">Enter a 6-digit match code</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>

          <button
            onClick={() => setShowSaved(true)}
            disabled={!user}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-purple-400 hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-purple-50">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Saved Scorecards</p>
              <p className="text-xs text-gray-500 mt-0.5">View your completed matches</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>
        </div>
      </div>

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Join Existing Match</h2>
              <button onClick={() => setShowJoin(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Enter the 6-digit match code shared by the home player.</p>
            <Input
              placeholder="e.g. 730617"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-xl font-mono tracking-widest mb-4 h-12"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleJoin}
              disabled={joining || joinCode.length !== 6}
            >
              {joining ? 'Looking up...' : 'Join Match'}
            </Button>
          </div>
        </div>
      )}

      {/* Saved Scorecards Modal */}
      {showSaved && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Saved Scorecards</h2>
              <button onClick={() => setShowSaved(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {savedLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
              ) : savedScorecards.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No saved scorecards yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedScorecards.map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => { setShowSaved(false); navigate(`/ScorecardDetail?id=${sc.id}&readonly=1`); }}
                      className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">vs {getOpponent(sc)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sc.created_date ? format(new Date(sc.created_date), 'd MMM yyyy') : '—'}
                          {' · '}Code: {sc.match_code}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-700 font-mono">{getScore(sc)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}