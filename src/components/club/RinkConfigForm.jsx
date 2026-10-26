import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import CustomSessionEditor from '@/components/booking/CustomSessionEditor';

const DEFAULTS = {
  rink_count: 6,
  opening_time: '10:00',
  closing_time: '21:00',
  session_duration: 2,
  use_custom_sessions: false,
  custom_sessions: [],
};

/**
 * Rink count, opening hours and session times for a single green.
 * Used by clubs that run both an indoor and an outdoor green.
 */
export default function RinkConfigForm({ title, description, value = {}, onChange }) {
  const config = { ...DEFAULTS, ...value };
  const set = (patch) => onChange({ ...config, ...patch });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Number of Rinks</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={config.rink_count}
            onChange={(e) => set({ rink_count: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Opening Time</Label>
            <Input type="time" value={config.opening_time} onChange={(e) => set({ opening_time: e.target.value })} />
          </div>
          <div>
            <Label>Closing Time</Label>
            <Input type="time" value={config.closing_time} onChange={(e) => set({ closing_time: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <Label className="text-base">Custom Session Times</Label>
            <p className="text-sm text-gray-500">Define specific session time ranges instead of a fixed duration</p>
          </div>
          <Switch
            checked={config.use_custom_sessions}
            onCheckedChange={(checked) => set({ use_custom_sessions: checked })}
          />
        </div>
        {!config.use_custom_sessions ? (
          <div>
            <Label>Session Duration (hours)</Label>
            <Input
              type="number"
              min="1"
              max="4"
              value={config.session_duration}
              onChange={(e) => set({ session_duration: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <Label className="mb-2 block">Session Time Ranges</Label>
            <p className="text-xs text-gray-500 mb-3">
              Define sessions within {config.opening_time}–{config.closing_time}. Minimum 15-minute intervals.
            </p>
            <CustomSessionEditor
              sessions={config.custom_sessions || []}
              onChange={(sessions) => set({ custom_sessions: sessions })}
              openingTime={config.opening_time}
              closingTime={config.closing_time}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}