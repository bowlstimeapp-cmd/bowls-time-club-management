import React from 'react';

export default function EndHeatmap({ matches }) {
  // Aggregate average score per end position across all matches
  const endTotals = {};
  const endCounts = {};

  matches.forEach(m => {
    m.endData.forEach(e => {
      if (!endTotals[e.end]) { endTotals[e.end] = 0; endCounts[e.end] = 0; }
      endTotals[e.end] += e.my;
      endCounts[e.end]++;
    });
  });

  const ends = Object.keys(endTotals).map(k => parseInt(k)).sort((a, b) => a - b).slice(0, 21);
  const avgs = ends.map(e => endCounts[e] > 0 ? endTotals[e] / endCounts[e] : 0);
  const maxAvg = Math.max(...avgs, 0.01);

  const getColour = (avg) => {
    const intensity = avg / maxAvg;
    if (intensity >= 0.8) return 'bg-emerald-600 text-white';
    if (intensity >= 0.6) return 'bg-emerald-400 text-white';
    if (intensity >= 0.4) return 'bg-emerald-200 text-emerald-800';
    if (intensity >= 0.2) return 'bg-emerald-100 text-emerald-700';
    return 'bg-gray-100 text-gray-400';
  };

  if (ends.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-4">No end data available</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {ends.map((e, i) => (
          <div key={e} className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs ${getColour(avgs[i])}`}>
            <span className="font-bold text-[10px]">{e}</span>
            <span className="font-semibold">{avgs[i].toFixed(1)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">Avg shots scored per end — darker = stronger</p>
    </div>
  );
}