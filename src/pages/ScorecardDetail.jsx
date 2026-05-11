import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

const NUM_ENDS = 25;

export default function ScorecardDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const scorecardId = urlParams.get('id');
  const role = urlParams.get('role'); // 'home' | 'away' | null
  const isReadOnly = urlParams.get('readonly') === '1';

  const [scorecard, setScorecard] = useState(null);
  const [homeScores, setHomeScores] = useState(Array(NUM_ENDS).fill(''));
  const [awayScores, setAwayScores] = useState(Array(NUM_ENDS).fill(''));
  const [homePlayer, setHomePlayer] = useState('');
  const [awayPlayer, setAwayPlayer] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { col: 'home'|'away', end: number }
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!scorecardId) return;
    base44.entities.Scorecard.filter({ id: scorecardId }).then(results => {
      if (!results.length) { toast.error('Scorecard not found'); return; }
      const sc = results[0];
      setScorecard(sc);
      setHomePlayer(sc.home_player || '');
      setAwayPlayer(sc.away_player || '');
      const hs = Array(NUM_ENDS).fill('');
      const as_ = Array(NUM_ENDS).fill('');
      (sc.home_scores || []).forEach((v, i) => { if (i < NUM_ENDS) hs[i] = v; });
      (sc.away_scores || []).forEach((v, i) => { if (i < NUM_ENDS) as_[i] = v; });
      setHomeScores(hs);
      setAwayScores(as_);
    });
  }, [scorecardId]);

  // Real-time subscription
  useEffect(() => {
    if (!scorecardId || isReadOnly) return;
    const unsub = base44.entities.Scorecard.subscribe(event => {
      if (event.id !== scorecardId) return;
      if (event.type === 'update') {
        const sc = event.data;
        setHomePlayer(sc.home_player || '');
        setAwayPlayer(sc.away_player || '');
        const hs = Array(NUM_ENDS).fill('');
        const as_ = Array(NUM_ENDS).fill('');
        (sc.home_scores || []).forEach((v, i) => { if (i < NUM_ENDS) hs[i] = v; });
        (sc.away_scores || []).forEach((v, i) => { if (i < NUM_ENDS) as_[i] = v; });
        setHomeScores(hs);
        setAwayScores(as_);
      }
    });
    return unsub;
  }, [scorecardId, isReadOnly]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const runningTotals = (scores) => {
    let total = 0;
    return scores.map(v => {
      total += parseInt(v) || 0;
      return total;
    });
  };

  const homeRunning = runningTotals(homeScores);
  const awayRunning = runningTotals(awayScores);
  const homeTotal = homeRunning[NUM_ENDS - 1];
  const awayTotal = awayRunning[NUM_ENDS - 1];

  const handleCellClick = (col, endIdx) => {
    if (isReadOnly) return;
    setEditingCell({ col, end: endIdx });
  };

  const handleCellChange = (col, endIdx, value) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 2);
    if (col === 'home') {
      const updated = [...homeScores];
      updated[endIdx] = sanitized;
      setHomeScores(updated);
    } else {
      const updated = [...awayScores];
      updated[endIdx] = sanitized;
      setAwayScores(updated);
    }
  };

  const handleCellKeyDown = (e, col, endIdx) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Persist immediately
      persistScores(col === 'home' ? [...homeScores] : homeScores, col === 'away' ? [...awayScores] : awayScores);
      // Move to next cell: same column, next end; wrap to other column at end
      if (endIdx < NUM_ENDS - 1) {
        setEditingCell({ col, end: endIdx + 1 });
      } else {
        setEditingCell(null);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleCellBlur = () => {
    persistScores(homeScores, awayScores);
    setEditingCell(null);
  };

  const persistScores = async (hs, as_) => {
    if (!scorecardId || isReadOnly) return;
    await base44.entities.Scorecard.update(scorecardId, {
      home_scores: hs,
      away_scores: as_,
      home_player: homePlayer,
      away_player: awayPlayer,
    });
  };

  const handlePlayerBlur = async () => {
    if (!scorecardId || isReadOnly) return;
    await base44.entities.Scorecard.update(scorecardId, { home_player: homePlayer, away_player: awayPlayer });
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Scorecard.update(scorecardId, {
      home_scores: homeScores,
      away_scores: awayScores,
      home_player: homePlayer,
      away_player: awayPlayer,
      is_complete: true,
    });
    setSaving(false);
    toast.success('Scorecard saved');
  };

  const copyCode = () => {
    if (scorecard?.match_code) {
      navigator.clipboard.writeText(scorecard.match_code);
      toast.success('Match code copied!');
    }
  };

  if (!scorecard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading scorecard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-3 py-4">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => navigate('/ScorecardHub')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-8 gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-400 font-medium">MATCH CODE</span>
              <span className="text-sm font-bold font-mono text-gray-800 tracking-widest">{scorecard.match_code}</span>
              {!isReadOnly && (
                <button onClick={copyCode} className="ml-1 text-gray-400 hover:text-emerald-600 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Player names */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Home Player</label>
            <Input
              value={homePlayer}
              onChange={e => setHomePlayer(e.target.value)}
              onBlur={handlePlayerBlur}
              placeholder="Home player name"
              disabled={isReadOnly || role === 'away'}
              className="bg-white border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Away Player</label>
            <Input
              value={awayPlayer}
              onChange={e => setAwayPlayer(e.target.value)}
              onBlur={handlePlayerBlur}
              placeholder="Away player name"
              disabled={isReadOnly || role === 'home'}
              className="bg-white border-gray-200"
            />
          </div>
        </div>

        {/* Score table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* Totals banner */}
          <div className="grid grid-cols-2 border-b border-gray-200">
            <div className="py-4 flex flex-col items-center border-r border-gray-200 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Home Total</p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">{homeTotal}</p>
            </div>
            <div className="py-4 flex flex-col items-center bg-amber-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Away Total</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">{awayTotal}</p>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-5 border-b border-gray-200 bg-gray-50">
            {['HOME', 'H.TOTAL', 'END', 'AWAY', 'A.TOTAL'].map((h, i) => (
              <div
                key={h}
                className={`py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide ${i === 2 ? 'bg-emerald-50 text-emerald-600' : ''}`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: NUM_ENDS }, (_, i) => {
            const isEditingHome = editingCell?.col === 'home' && editingCell?.end === i;
            const isEditingAway = editingCell?.col === 'away' && editingCell?.end === i;

            return (
              <div
                key={i}
                className={`grid grid-cols-5 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                {/* Home score */}
                <div
                  className={`flex items-center justify-center h-9 text-sm text-gray-700 ${!isReadOnly ? 'cursor-pointer hover:bg-emerald-50' : ''}`}
                  onClick={() => handleCellClick('home', i)}
                >
                  {isEditingHome ? (
                    <input
                      ref={inputRef}
                      className="w-full h-full text-center text-sm outline-none bg-emerald-50 font-medium text-gray-800"
                      value={homeScores[i]}
                      onChange={e => handleCellChange('home', i, e.target.value)}
                      onKeyDown={e => handleCellKeyDown(e, 'home', i)}
                      onBlur={handleCellBlur}
                    />
                  ) : (
                    <span className="font-medium">{homeScores[i]}</span>
                  )}
                </div>

                {/* Home running total */}
                <div className="flex items-center justify-center h-9 text-sm text-gray-500 border-r border-gray-100">
                  {homeScores[i] !== '' ? <span>{homeRunning[i]}</span> : null}
                </div>

                {/* End number */}
                <div className="flex items-center justify-center h-9 bg-emerald-50/60 border-x border-gray-100">
                  <span className="text-xs font-semibold text-emerald-600">{i + 1}</span>
                </div>

                {/* Away score */}
                <div
                  className={`flex items-center justify-center h-9 text-sm text-gray-700 border-l border-gray-100 ${!isReadOnly ? 'cursor-pointer hover:bg-amber-50' : ''}`}
                  onClick={() => handleCellClick('away', i)}
                >
                  {isEditingAway ? (
                    <input
                      ref={isEditingAway ? inputRef : null}
                      className="w-full h-full text-center text-sm outline-none bg-amber-50 font-medium text-gray-800"
                      value={awayScores[i]}
                      onChange={e => handleCellChange('away', i, e.target.value)}
                      onKeyDown={e => handleCellKeyDown(e, 'away', i)}
                      onBlur={handleCellBlur}
                    />
                  ) : (
                    <span className="font-medium">{awayScores[i]}</span>
                  )}
                </div>

                {/* Away running total */}
                <div className="flex items-center justify-center h-9 text-sm text-gray-500">
                  {awayScores[i] !== '' ? <span>{awayRunning[i]}</span> : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom save */}
        {!isReadOnly && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Scorecard'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}