import React, { useState } from 'react';
import EloSparkline from './EloSparkline';
import EloHistoryChart from './EloHistoryChart';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

function StatusBadge({ record }) {
  if (record.is_verified) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Verified</span>;
  }
  const hasEnoughOpponents = (record.unique_opponents || []).length >= 3;
  if (!hasEnoughOpponents) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">🔒 Unverified</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🟡 Provisional</span>;
}

export default function LeaderboardRow({ record, rank, isOwnRow }) {
  const [expanded, setExpanded] = useState(false);

  const winPct = record.matches_played > 0
    ? Math.round((record.wins / record.matches_played) * 100)
    : 0;

  const confidenceFill = Math.min(100, Math.round(((record.matches_played || 0) / 40) * 100));
  const hasEnoughOpponents = (record.unique_opponents || []).length >= 3;

  return (
    <div className={`rounded-2xl border transition-all ${isOwnRow ? 'border-emerald-300 bg-emerald-50/60 shadow-sm' : 'border-gray-200 bg-white'}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
          rank === 1 ? 'bg-yellow-400 text-white' :
          rank === 2 ? 'bg-gray-300 text-gray-700' :
          rank === 3 ? 'bg-amber-600 text-white' :
          isOwnRow ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {rank}
        </div>

        {/* Name + badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-bold truncate ${isOwnRow ? 'text-emerald-800' : 'text-gray-900'}`}>
              {record.player_name}
              {isOwnRow && <span className="ml-1 text-xs font-normal text-emerald-600">(You)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge record={record} />
            <span className="text-xs text-gray-400">{record.matches_played}P · {winPct}% W</span>
          </div>
        </div>

        {/* Sparkline */}
        <EloSparkline history={record.elo_history || []} />

        {/* ELO */}
        <div className="text-right flex-shrink-0">
          <p className={`text-xl font-black ${isOwnRow ? 'text-emerald-700' : 'text-gray-900'}`}>{record.elo}</p>
          <p className="text-xs text-gray-400">ELO</p>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-gray-300">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pb-2">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOwnRow ? 'bg-emerald-500' : 'bg-gray-300'}`}
            style={{ width: `${confidenceFill}%` }}
          />
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          {/* Warning for unverified */}
          {!hasEnoughOpponents && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Rating based on limited opponent variety — may not reflect true club standing</p>
            </div>
          )}

          {/* ELO history chart */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">ELO History</p>
            <EloHistoryChart history={record.elo_history || []} />
          </div>

          {/* Opponents list */}
          {(record.unique_opponents || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Opponents Faced ({record.unique_opponents.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {record.unique_opponents.map((opp, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{opp}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              ['Played', record.matches_played],
              ['Wins', record.wins],
              ['Losses', record.losses],
              ['Win %', `${winPct}%`],
            ].map(([label, val]) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl p-2">
                <p className="text-base font-bold text-gray-800">{val}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}