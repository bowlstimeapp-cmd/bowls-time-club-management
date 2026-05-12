import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

export default function FormChart({ data }) {
  if (!data || data.length < 2) {
    return <div className="flex items-center justify-center h-32 text-sm text-gray-400">Not enough data yet</div>;
  }

  const chartData = data.map((d, i) => ({
    match: i + 1,
    'Win %': Math.round(d.winPct),
    Margin: d.margin,
    date: d.date ? format(new Date(d.date), 'd MMM') : `M${i + 1}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v) => [`${v}%`, 'Win %']}
        />
        <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="Win %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}