import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';

export default function BlacklistDatesDialog({ open, onClose, league }) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  // Local copy so list updates immediately without waiting for query refetch
  const [localDates, setLocalDates] = useState([]);

  useEffect(() => {
    if (league) {
      setLocalDates(league.blacklisted_dates || []);
    }
  }, [league]);

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
    },
  });

  const handleAddDate = async () => {
    if (!newDate) {
      toast.error('Please select a date');
      return;
    }
    // Prevent duplicates
    if (localDates.some(d => d.date === newDate)) {
      toast.error('This date is already blacklisted');
      return;
    }

    const entry = { date: newDate, reason: reason.trim() || 'Unavailable' };
    const updated = [...localDates, entry].sort((a, b) => a.date.localeCompare(b.date));

    // Update local state immediately
    setLocalDates(updated);
    setNewDate('');
    setReason('');

    try {
      await updateLeagueMutation.mutateAsync({
        id: league.id,
        data: { blacklisted_dates: updated }
      });
      toast.success('Date blacklisted');
    } catch {
      // Rollback on error
      setLocalDates(localDates);
      toast.error('Failed to save blacklisted date');
    }
  };

  const handleRemoveDate = async (index) => {
    const updated = localDates.filter((_, i) => i !== index);
    setLocalDates(updated);

    try {
      await updateLeagueMutation.mutateAsync({
        id: league.id,
        data: { blacklisted_dates: updated }
      });
      toast.success('Date removed');
    } catch {
      setLocalDates(localDates);
      toast.error('Failed to remove date');
    }
  };

  if (!league) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Blacklisted Dates — {league.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add single date */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="font-medium">Add Blacklisted Date</Label>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Christmas, Maintenance"
              />
            </div>
            <Button
              onClick={handleAddDate}
              disabled={updateLeagueMutation.isPending}
              className="w-full"
            >
              {updateLeagueMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Date
            </Button>
          </div>

          {/* Current blacklisted dates */}
          <div>
            <Label className="font-medium mb-3 block">Current Blacklisted Dates</Label>
            {localDates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No blacklisted dates. Fixtures can be scheduled on any date.
              </p>
            ) : (
              <div className="space-y-2">
                {localDates.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {format(parseISO(entry.date), 'd MMM yyyy')}
                      </div>
                      {entry.reason && (
                        <div className="text-xs text-gray-500 mt-0.5">{entry.reason}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDate(index)}
                      className="text-red-600 hover:text-red-700 ml-4"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}