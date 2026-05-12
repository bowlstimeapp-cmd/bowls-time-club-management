import React from 'react';
import { format } from 'date-fns';

export default function MatchResultsList({ matches, limit = 10 }) {
  if (!matches || matches.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No matches recorded yet</p>;
  }

  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

  return (
    <div className="space-y-2">
      {sorted.map((m, i) => (
        <div key={m.id || i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.won ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {m.won ? 'W' : 'L'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">vs {m.opponentName}</p>
            <p className="text-xs text-gray-400">{m.date ? format(new Date(m.date), 'd MMM yyyy') : '—'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold font-mono text-gray-700">{m.myTotal} – {m.oppTotal}</p>
            <p className={`text-xs font-medium ${m.margin > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {m.margin > 0 ? `+${m.margin}` : m.margin}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}