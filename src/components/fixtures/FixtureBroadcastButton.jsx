import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Admin control that opens or closes member sign-up for one fixture.
 * Stopping a broadcast that already has sign-ups asks for confirmation first.
 */
export default function FixtureBroadcastButton({ fixture, clubId, interestCount = 0 }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isBroadcast = fixture.broadcast === true;

  const run = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('updateFixture', {
        fixtureId: fixture.id,
        club_id: clubId,
        updates: { broadcast: !isBroadcast },
      });
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success(isBroadcast
        ? 'Sign-up closed. The fixture is no longer shown to members.'
        : 'Fixture broadcast. Members can now sign up on their dashboard.');
      queryClient.invalidateQueries({ queryKey: ['clubFixtures', clubId] });
      queryClient.invalidateQueries({ queryKey: ['upcomingClubFixtures', clubId] });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update broadcast');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleToggle = (checked) => {
    if (!checked && interestCount > 0) {
      setConfirmOpen(true);
      return;
    }
    run();
  };

  return (
    <>
      <div className="mr-1 inline-flex items-center gap-1.5 min-h-[44px]">
        <Megaphone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <label
          htmlFor={`broadcast-${fixture.id}`}
          className="text-xs font-medium text-emerald-700 cursor-pointer select-none"
        >
          Broadcast
        </label>
        <Switch
          id={`broadcast-${fixture.id}`}
          checked={isBroadcast}
          disabled={saving}
          onCheckedChange={handleToggle}
          aria-label="Broadcast fixture to members for sign-up"
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop broadcasting this fixture?</AlertDialogTitle>
            <AlertDialogDescription>
              {interestCount} {interestCount === 1 ? 'member has' : 'members have'} signed up. Their sign-ups stay
              recorded for selectors, but the fixture will be removed from members' dashboards and no more sign-ups
              will be accepted. Stop broadcasting?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep broadcasting</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); run(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop broadcasting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}