import React from 'react';
import { TrendingUp, TrendingDown, Lightbulb, Shield } from 'lucide-react';

const typeConfig = {
  strength: { icon: TrendingUp, colour: 'bg-emerald-50 border-emerald-200 text-emerald-800', iconColour: 'text-emerald-500' },
  weakness: { icon: TrendingDown, colour: 'bg-red-50 border-red-200 text-red-800', iconColour: 'text-red-400' },
  trend: { icon: TrendingUp, colour: 'bg-blue-50 border-blue-200 text-blue-800', iconColour: 'text-blue-500' },
  insight: { icon: Lightbulb, colour: 'bg-amber-50 border-amber-200 text-amber-800', iconColour: 'text-amber-500' },
};

export default function InsightCard({ insight }) {
  const cfg = typeConfig[insight.type] || typeConfig.insight;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.colour}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconColour}`} />
      <p className="text-sm font-medium leading-snug">{insight.text}</p>
    </div>
  );
}