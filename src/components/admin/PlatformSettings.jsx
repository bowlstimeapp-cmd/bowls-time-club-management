import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from 'lucide-react';

export default function PlatformSettings() {
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
        </div>
      </CardContent>
    </Card>
  );
}