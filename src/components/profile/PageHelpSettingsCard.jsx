import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LifeBuoy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { clearAllHelpPopupDismissals } from '@/lib/helpPopupStorage';

export default function PageHelpSettingsCard() {
  const [user, setUser] = useState(null);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setEnabled(currentUser.help_popups_enabled !== false);
      if (currentUser.email) {
        const memberships = await base44.entities.ClubMembership.filter({
          user_email: currentUser.email,
          status: 'approved',
        });
        setHasAdminRole(
          memberships.some(m => m.role === 'admin' || m.role === 'selector')
        );
      }
    };
    load();
  }, []);

  const handleToggle = async (checked) => {
    setEnabled(checked);
    setSaving(true);
    try {
      await base44.auth.updateMe({ help_popups_enabled: checked });
      toast.success(checked ? 'Help pop-ups switched on' : 'Help pop-ups switched off');
    } catch {
      toast.error('Could not save your preference');
      setEnabled(!checked);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await clearAllHelpPopupDismissals();
      toast.success('Dismissed pop-ups cleared — they will show again');
    } catch {
      toast.error('Could not reset your pop-ups');
    } finally {
      setResetting(false);
    }
  };

  if (!user || !hasAdminRole) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-emerald-600" />
          Page help pop-ups
        </CardTitle>
        <CardDescription>
          Short guides appear when you open an admin page, using the steps from the Help Centre.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="help-popups-enabled" className="text-base">
            Show help pop-ups on admin pages
          </Label>
          <Switch
            id="help-popups-enabled"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-3">
            Already dismissed a guide? Bring every page's pop-up back.
          </p>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetting}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Show all dismissed pop-ups again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}