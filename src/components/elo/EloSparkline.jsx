import React from 'react';

/**
 * Mini sparkline rendered as a simple SVG path from elo_history
 */
export default function EloSparkline({ history = [], width = 60, height = 24 }) {
  const last10 = history.slice(-10).map(h => h.elo);
  if (last10.length < 2) {
    return <div className="w-14 h-6 flex items-center justify-center text-gray-300 text-xs">—</div>;
  }

  const min = Math.min(...last10);
  const max = Math.max(...last10);
  const range = max - min || 1;

  const pts = last10.map((v, i) => {
    const x = (i / (last10.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = pts.join(' ');
  const rising = last10[last10.length - 1] >= last10[0];
  const colour = rising ? '#10b981' : '#ef4444';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline
        points={polyline}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}