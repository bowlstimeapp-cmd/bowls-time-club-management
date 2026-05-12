import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

export default function EloHistoryChart({ history = [] }) {
  if (history.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-4">Not enough data yet</p>;
  }

  const data = history.map((h, i) => ({
    label: h.date ? format(new Date(h.date), 'd MMM') : `M${i + 1}`,
    elo: h.elo,
    opponent: h.opponent,
    result: h.result,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow text-xs">
        <p className="font-bold text-gray-800">{d.elo} ELO</p>
        <p className="text-gray-500">vs {d.opponent}</p>
        <p className={d.result === 'W' ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{d.result === 'W' ? 'Win' : 'Loss'}</p>
        <p className="text-gray-400">{d.label}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
        <ReferenceLine y={1200} stroke="#e5e7eb" strokeDasharray="3 3" />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="elo" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#10b981' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}