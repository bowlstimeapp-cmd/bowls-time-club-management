import React from 'react';

export default function StatCard({ label, value, sub, accent = 'emerald', icon: Icon }) {
  const colours = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  const cls = colours[accent] || colours.emerald;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${cls}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}