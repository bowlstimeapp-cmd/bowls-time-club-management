import React from 'react';

export default function PpiGauge({ ppi }) {
  const score = Math.round(ppi);
  const angle = (score / 100) * 180;
  const r = 70;
  const cx = 90, cy = 90;

  function polarToXY(deg) {
    const rad = ((deg - 180) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const start = polarToXY(0);
  const end = polarToXY(angle);
  const largeArc = angle > 90 ? 1 : 0;

  const colour = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Excellent' : score >= 55 ? 'Good' : score >= 40 ? 'Average' : 'Developing';

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Background arc */}
        <path
          d={`M ${20} ${90} A ${r} ${r} 0 0 1 ${160} ${90}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {score > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={colour}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        {/* Score */}
        <text x={cx} y={82} textAnchor="middle" fontSize="28" fontWeight="bold" fill={colour}>{score}</text>
        <text x={cx} y={100} textAnchor="middle" fontSize="11" fill="#9ca3af">{label}</text>
      </svg>
      <p className="text-xs text-gray-400 -mt-1">Performance Index</p>
    </div>
  );
}