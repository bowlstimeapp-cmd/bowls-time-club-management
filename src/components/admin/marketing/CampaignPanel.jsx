import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarRange, ListChecks, Package, Flag } from 'lucide-react';
import { SPRINTS, THIS_WEEK, ASSETS_NEEDED } from './marketingPlanData';

const STORAGE_KEY = 'bt_marketing_week_checklist';

// Week bucket so the checklist resets every Monday morning
const weekKey = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toISOString().slice(0, 10);
};

function loadDone() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return raw.week === weekKey() ? raw.done || [] : [];
  } catch (e) {
    return [];
  }
}

export default function CampaignPanel() {
  const [done, setDone] = useState(loadDone);

  const toggle = (index) => {
    const next = done.includes(index) ? done.filter(i => i !== index) : [...done, index];
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ week: weekKey(), done: next }));
    } catch (e) { /* storage is best-effort */ }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="w-4 h-4 text-emerald-600" />Do these seven things this week
            </CardTitle>
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">{done.length} / {THIS_WEEK.length} done</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {THIS_WEEK.map((task, i) => (
              <label
                key={task}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox checked={done.includes(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                <span className={`text-sm ${done.includes(i) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Resets every Monday. Five protected hours a week beats a burst you cannot repeat.</p>
        </CardContent>
      </Card>

      {SPRINTS.map((sprint) => (
        <Card key={sprint.title}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="w-4 h-4 text-emerald-600" />{sprint.title}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{sprint.window}</Badge>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200">{sprint.hours}</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{sprint.goal}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprint.weeks.map(w => (
              <div key={w.label} className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{w.label}</p>
                <ul className="space-y-1">
                  {w.actions.map(a => (
                    <li key={a} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-emerald-500 shrink-0">→</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <Flag className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-900">{sprint.milestone}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-emerald-600" />Assets to produce (all free)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {ASSETS_NEEDED.map(a => (
              <li key={a} className="text-sm text-gray-700 flex gap-2">
                <span className="text-gray-400">—</span>{a}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}