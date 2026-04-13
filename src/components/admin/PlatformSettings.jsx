import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PlatformSettings() {
  const [resetting, setResetting] = useState(false);

  const handleResetTour = async () => {
    setResetting(true);
    await base44.auth.updateMe({ tour_completed: false });
    setResetting(false);
    toast.success('Tour reset — it will show again on your next visit to Rink Booking.');
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
          <div>
            <p className="text-base font-medium">New User Tour</p>
            <p className="text-sm text-gray-500 mt-0.5">
              The interactive new user tour is shown to all users by default when they visit the Rink Booking page. It will continue to appear each session until the user clicks "Close the New User Tour and do not show again".
            </p>
          </div>
          <p className="text-xs text-emerald-700 mt-3 bg-emerald-50 rounded p-2 border border-emerald-100">
            ✓ Tour is active for all users who haven't permanently dismissed it.
          </p>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTour}
              disabled={resetting}
              className="text-gray-600"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {resetting ? 'Resetting...' : 'Reset tour for my account'}
            </Button>
            <p className="text-xs text-gray-400 mt-1">Use this to re-enable the tour for your own account after dismissing it.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}