import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function AnalyticsRadar({ analytics }) {
  const data = [
    { subject: 'Winning', value: Math.round(analytics.winPct) },
    { subject: 'Consistency', value: Math.round(analytics.consistencyRating) },
    { subject: 'Scoring', value: Math.min(100, Math.round(analytics.avgShotsPerEnd * 25)) },
    { subject: 'Defence', value: Math.max(0, Math.round(100 - analytics.avgConcededPerEnd * 25)) },
    { subject: 'Clutch', value: Math.round(analytics.closerRating) },
    { subject: 'Form', value: Math.round(analytics.rollingWin5) },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Radar name="You" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}