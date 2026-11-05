import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Target, CalendarRange, PenLine, Gauge, Clock, PiggyBank } from 'lucide-react';
import StrategyPanel from './StrategyPanel';
import CampaignPanel from './CampaignPanel';
import CopyPanel from './CopyPanel';
import ScoreboardPanel from './ScoreboardPanel';

export default function MarketingPlanTab() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200">
        <div className="bg-slate-900 text-white p-5 sm:p-6">
          <Badge className="bg-emerald-500 text-white border-0 mb-3">
            <PiggyBank className="w-3 h-3 mr-1" />Zero budget
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400 shrink-0" />
            The Bowls Time growth engine
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            One plan, one owner, five hours a week, no spend. Sell to the people who already talk to every bowls club in the country — county associations first, then club to club — and let the product itself do the referring.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5 max-w-md">
            <div className="rounded-lg bg-white/10 p-3">
              <Clock className="w-4 h-4 text-emerald-400 mb-1" />
              <p className="text-sm font-bold">5 hrs</p>
              <p className="text-xs text-slate-400">a week, protected</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <PiggyBank className="w-4 h-4 text-emerald-400 mb-1" />
              <p className="text-sm font-bold">£0</p>
              <p className="text-xs text-slate-400">total spend</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <CalendarRange className="w-4 h-4 text-emerald-400 mb-1" />
              <p className="text-sm font-bold">90 days</p>
              <p className="text-xs text-slate-400">to 12 clubs live</p>
            </div>
          </div>
        </div>
        <CardContent className="p-4 sm:p-5 bg-white">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">The one-line strategy:</span> bowls clubs do not buy software from adverts, they buy it from another club secretary. So the whole plan is built to manufacture introductions, and to make the product obvious in the first three minutes of a phone call.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="strategy" className="w-full">
        <div className="overflow-x-auto mb-4">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="strategy" className="whitespace-nowrap">
              <Target className="w-3.5 h-3.5 mr-1.5" />Strategy
            </TabsTrigger>
            <TabsTrigger value="campaign" className="whitespace-nowrap">
              <CalendarRange className="w-3.5 h-3.5 mr-1.5" />90-day campaign
            </TabsTrigger>
            <TabsTrigger value="copy" className="whitespace-nowrap">
              <PenLine className="w-3.5 h-3.5 mr-1.5" />Copy & templates
            </TabsTrigger>
            <TabsTrigger value="scoreboard" className="whitespace-nowrap">
              <Gauge className="w-3.5 h-3.5 mr-1.5" />Scoreboard
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="strategy"><StrategyPanel /></TabsContent>
        <TabsContent value="campaign"><CampaignPanel /></TabsContent>
        <TabsContent value="copy"><CopyPanel /></TabsContent>
        <TabsContent value="scoreboard"><ScoreboardPanel /></TabsContent>
      </Tabs>
    </div>
  );
}