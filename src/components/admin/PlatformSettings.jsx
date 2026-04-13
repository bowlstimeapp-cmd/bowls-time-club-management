import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from 'lucide-react';

const TOUR_KEY = 'bowlstime_tour_enabled';

export default function PlatformSettings() {
  const [tourEnabled, setTourEnabled] = useState(() => {
    try { return localStorage.getItem(TOUR_KEY) === 'true'; } catch { return false; }
  });

  const handleToggleTour = (checked) => {
    setTourEnabled(checked);
    try { localStorage.setItem(TOUR_KEY, checked ? 'true' : 'false'); } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          Platform Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">New User Tour</Label>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, new users who visit the Rink Booking page for the first time will be shown an interactive guided tour.
              </p>
            </div>
            <Switch
              checked={tourEnabled}
              onCheckedChange={handleToggleTour}
            />
          </div>
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded p-2 border border-amber-100">
            ⚠ This setting is stored locally in the browser. It must be enabled on each device/browser where you want the tour to be active.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}