import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Star, AlertTriangle } from 'lucide-react';
import { KPIS } from './marketingPlanData';

export default function ScoreboardPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="w-4 h-4 text-emerald-600" />The only seven numbers that matter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {KPIS.map(k => (
              <div key={k.metric} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900">{k.metric}</p>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{k.target}</Badge>
                </div>
                <p className="text-sm text-gray-600">{k.why}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-4 h-4 text-amber-500" />What to ignore, deliberately
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li className="flex gap-2"><span className="text-gray-400">—</span>Follower counts. Ten right people beat a thousand wrong ones.</li>
            <li className="flex gap-2"><span className="text-gray-400">—</span>Website visitors at this stage. You are doing outreach, not waiting to be found.</li>
            <li className="flex gap-2"><span className="text-gray-400">—</span>Brand awareness. Nobody knows the brand yet and that is fine.</li>
            <li className="flex gap-2"><span className="text-gray-400">—</span>Any channel that produced no demo in a month. Cut it without guilt.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-red-500" />Three things that will quietly waste the whole quarter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              ['Polishing the product instead of talking to secretaries', 'Every feature you build this quarter must be traced back to a sentence a club admin actually said.'],
              ['Mass mailing 2,000 clubs', 'You will burn the list in a week. Ten personal emails a day, every day.'],
              ['Signing clubs up and walking away', 'A club that never makes a booking is a churn, not a win. Chase the first booking within seven days.'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-sm font-semibold text-red-900">{title}</p>
                <p className="text-sm text-red-800 mt-0.5">{detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}