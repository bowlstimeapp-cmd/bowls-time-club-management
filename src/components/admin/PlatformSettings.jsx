import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings, RotateCcw, Layout, Grid } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLayoutTheme, LAYOUTS } from '@/lib/layoutTheme.jsx';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_TIME_COL = 72;
const DEFAULT_RINK_COL = 60;

export default function PlatformSettings() {
  const [resetting, setResetting] = useState(false);
  const { layout, setLayout } = useLayoutTheme();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');

  // Grid column width state
  const [timeColWidth, setTimeColWidth] = useState(DEFAULT_TIME_COL);
  const [rinkColWidth, setRinkColWidth] = useState(DEFAULT_RINK_COL);
  const [savingGrid, setSavingGrid] = useState(false);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (club) {
      setTimeColWidth(club.rink_grid_time_col_width || DEFAULT_TIME_COL);
      setRinkColWidth(club.rink_grid_rink_col_width || DEFAULT_RINK_COL);
    }
  }, [club]);
  const [altLayoutEnabled, setAltLayoutEnabled] = useState(layout !== 'default');

  const handleSaveGrid = async () => {
    if (!club) return;
    setSavingGrid(true);
    await base44.entities.Club.update(club.id, {
      rink_grid_time_col_width: timeColWidth,
      rink_grid_rink_col_width: rinkColWidth,
    });
    setSavingGrid(false);
    toast.success('Grid layout saved — all members will see the updated layout');
  };

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

      {/* Rink Grid Column Widths */}
      {clubId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-gray-600" />
              Rink Grid Column Widths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-500">
              Adjust the width of the time and rink columns in the Rink Booking grid. Changes apply club-wide — all members see the updated layout.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Time column slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Time column width</Label>
                  <span className="text-sm font-mono text-emerald-700">{timeColWidth}px</span>
                </div>
                <Slider
                  min={48} max={140} step={4}
                  value={[timeColWidth]}
                  onValueChange={([v]) => setTimeColWidth(v)}
                />
                <p className="text-xs text-gray-400">The column showing session times on the left of the grid</p>
              </div>

              {/* Rink column slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rink column width</Label>
                  <span className="text-sm font-mono text-emerald-700">{rinkColWidth}px</span>
                </div>
                <Slider
                  min={50} max={140} step={5}
                  value={[rinkColWidth]}
                  onValueChange={([v]) => setRinkColWidth(v)}
                />
                <p className="text-xs text-gray-400">Minimum width of each rink column — columns expand to fill available space</p>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
              <div className="overflow-x-auto border rounded-lg bg-gray-50 p-3">
                <div style={{ minWidth: `${timeColWidth + 6 * (rinkColWidth + 8)}px` }}>
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `${timeColWidth}px repeat(6, minmax(${rinkColWidth}px, 1fr))` }}
                  >
                    <div className="bg-gray-200 rounded px-1.5 py-2 text-xs text-gray-600 font-medium text-center">2:00pm</div>
                    {[1,2,3,4,5,6].map(r => (
                      <div
                        key={r}
                        className={cn(
                          "rounded px-1 py-2 text-xs font-medium text-center border",
                          r % 2 === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-600"
                        )}
                      >
                        Rink {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Preview shows relative proportions — actual grid scrolls horizontally on mobile when content exceeds screen width</p>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t">
              <Button onClick={handleSaveGrid} disabled={savingGrid} className="bg-emerald-600 hover:bg-emerald-700">
                {savingGrid ? 'Saving...' : 'Save layout'}
              </Button>
              <button
                type="button"
                onClick={() => { setTimeColWidth(DEFAULT_TIME_COL); setRinkColWidth(DEFAULT_RINK_COL); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reset to defaults
              </button>
            </div>
          </CardContent>
        </Card>
      )}

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