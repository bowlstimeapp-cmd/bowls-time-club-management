import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RotateCcw, Layout } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLayoutTheme, LAYOUTS } from '@/lib/layoutTheme';
import { cn } from '@/lib/utils';

export default function PlatformSettings() {
  const [resetting, setResetting] = useState(false);
  const { layout, setLayout } = useLayoutTheme();
  const [altLayoutEnabled, setAltLayoutEnabled] = useState(layout !== 'default');

  const handleResetTour = async () => {
    setResetting(true);
    await base44.auth.updateMe({ tour_completed: false });
    setResetting(false);
    toast.success('Tour reset — it will show again on your next visit to Rink Booking.');
  };

  const handleToggleAltLayout = (enabled) => {
    setAltLayoutEnabled(enabled);
    if (!enabled) {
      setLayout('default');
    }
  };

  const handleLayoutChange = (value) => {
    setLayout(value);
    toast.success(`Layout changed to "${LAYOUTS[value]?.label}"`);
  };

  return (
    <div className="space-y-4">
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

      {/* Alternative Layouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-gray-600" />
            Alternative Layouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-gray-500">
            Change the visual layout of cards throughout the app — affects Selection cards, League cards, and other list views. This setting is stored per-browser.
          </p>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Alternative Layout</Label>
              <p className="text-sm text-gray-500">Switch from the default card style to an alternative layout</p>
            </div>
            <Switch checked={altLayoutEnabled} onCheckedChange={handleToggleAltLayout} />
          </div>

          {altLayoutEnabled && (
            <div className="space-y-4 pt-2 border-t">
              <div>
                <Label className="mb-2 block">Select Layout</Label>
                <Select value={layout === 'default' ? 'compact' : layout} onValueChange={handleLayoutChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAYOUTS).filter(([k]) => k !== 'default').map(([key, { label, description }]) => (
                      <SelectItem key={key} value={key}>
                        <span className="font-medium">{label}</span>
                        <span className="text-gray-400 ml-2 text-xs">— {description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview swatches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(LAYOUTS).filter(([k]) => k !== 'default').map(([key, { label, description }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLayoutChange(key)}
                    className={cn(
                      "text-left p-3 rounded-lg border-2 transition-all",
                      layout === key
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <LayoutPreview variant={key} />
                    <p className="text-sm font-medium mt-2">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LayoutPreview({ variant }) {
  if (variant === 'compact') {
    return (
      <div className="space-y-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <div className="h-2 bg-gray-300 rounded flex-1" />
            <div className="w-8 h-2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div className="space-y-1.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
            <div className="h-2 bg-gray-300 rounded flex-1" />
            <div className="w-8 h-2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'bold') {
    return (
      <div className="space-y-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded overflow-hidden">
            <div className="h-1.5 bg-emerald-500 w-full" />
            <div className="bg-gray-100 px-2 py-1.5 flex items-center gap-2">
              <div className="h-2 bg-gray-400 rounded flex-1" />
              <div className="w-6 h-2 bg-gray-300 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}