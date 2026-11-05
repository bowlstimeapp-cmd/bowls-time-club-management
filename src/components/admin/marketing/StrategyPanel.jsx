import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, XCircle, Users, TrendingUp } from 'lucide-react';
import { POSITIONING, PERSONAS, CHANNELS } from './marketingPlanData';

export default function StrategyPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-emerald-600" />The position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-semibold text-gray-900">{POSITIONING.one_liner}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{POSITIONING.promise}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
                <CheckCircle2 className="w-4 h-4" />Always say
              </p>
              <ul className="space-y-1.5">
                {POSITIONING.say.map(item => (
                  <li key={item} className="text-sm text-emerald-900 flex gap-2">
                    <span className="text-emerald-500">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-2">
                <XCircle className="w-4 h-4" />Never say
              </p>
              <ul className="space-y-1.5">
                {POSITIONING.never_say.map(item => (
                  <li key={item} className="text-sm text-red-900 flex gap-2">
                    <span className="text-red-400">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proof you need before spending a penny</p>
            <ul className="space-y-1">
              {POSITIONING.proof_to_build.map(item => (
                <li key={item} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-gray-400">—</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-emerald-600" />Who you are selling to
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PERSONAS.map(p => (
            <div key={p.role} className="rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-gray-900 text-sm">{p.role}</h4>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs shrink-0">{p.win}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Pain:</span> {p.pain}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Your line:</span> “{p.hook}”</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-emerald-600" />Where the clubs are — ranked, free channels only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHANNELS.map(c => (
            <div key={c.name} className="rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {c.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{c.name}</h4>
                    <Badge variant="outline" className="text-xs">Effort: {c.effort}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Return: {c.return}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1.5">{c.why}</p>
                  <p className="text-sm text-gray-800"><span className="font-semibold">The play: </span>{c.play}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}