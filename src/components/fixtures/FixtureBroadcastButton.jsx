import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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

  const handleClick = () => {
    if (isBroadcast && interestCount > 0) {
      setConfirmOpen(true);
      return;
    }
    run();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={handleClick}
        title={isBroadcast ? 'Stop broadcasting this fixture' : 'Broadcast to members for sign-up'}
        className={isBroadcast
          ? 'group mr-1 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white'
          : 'mr-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
      >
        {saving
          ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          : <Megaphone className="w-3 h-3 mr-1" />}
        {isBroadcast ? (
          <>
            <span className="group-hover:hidden">Broadcasting</span>
            <span className="hidden group-hover:inline">Stop</span>
          </>
        ) : 'Broadcast'}
      </Button>

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