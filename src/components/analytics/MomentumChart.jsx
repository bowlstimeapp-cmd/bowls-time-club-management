import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function MomentumChart({ momentum, turningPoints = [] }) {
  if (!momentum || momentum.length < 2) {
    return <div className="flex items-center justify-center h-32 text-sm text-gray-400">No end data</div>;
  }

  const data = momentum.map(m => ({ end: m.end, diff: m.diff, myTotal: m.myTotal, oppTotal: m.oppTotal }));

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const isTurning = turningPoints.some(tp => tp.end === payload.end);
    if (!isTurning) return null;
    return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />;
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <defs>
          <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="end" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'End', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v, name) => [v > 0 ? `+${v}` : v, 'Score Diff']}
          labelFormatter={l => `End ${l}`}
        />
        <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} />
        <Area
          type="monotone"
          dataKey="diff"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#gradPos)"
          dot={<CustomDot />}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}