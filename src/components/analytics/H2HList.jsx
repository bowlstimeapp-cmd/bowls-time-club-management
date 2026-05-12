import React from 'react';

export default function H2HList({ h2h }) {
  if (!h2h || h2h.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No head-to-head data yet</p>;
  }

  return (
    <div className="space-y-2">
      {h2h.slice(0, 8).map(opp => {
        const winPct = Math.round(opp.winPct);
        const barColour = winPct >= 60 ? 'bg-emerald-500' : winPct >= 40 ? 'bg-amber-400' : 'bg-red-400';
        return (
          <div key={opp.name} className="bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-800">{opp.name}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-emerald-600 font-bold">{opp.wins}W</span>
                <span className="text-red-500 font-bold">{opp.losses}L</span>
                <span className="text-gray-400">{opp.played} played</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColour}`} style={{ width: `${winPct}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-600 w-10 text-right">{winPct}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Avg margin {opp.avgMargin > 0 ? '+' : ''}{opp.avgMargin.toFixed(1)} · Ends won {Math.round(opp.endsWonPct)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}