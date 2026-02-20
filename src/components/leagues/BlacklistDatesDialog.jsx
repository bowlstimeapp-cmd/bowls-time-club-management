import React, { useState } from 'react';
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';

export default function BlacklistDatesDialog({ open, onClose, league }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: (updatedLeague) => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Blacklisted dates updated');
      setStartDate('');
      setEndDate('');
      setReason('');
    },
  });

  const handleAddBlacklist = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    const blacklisted = league?.blacklisted_dates || [];
    const newEntry = {
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || 'Unavailable'
    };

    try {
      await updateLeagueMutation.mutateAsync({
        id: league.id,
        data: { blacklisted_dates: [...blacklisted, newEntry] }
      });
    } catch (error) {
      toast.error('Failed to add blacklisted dates');
    }
  };

  const handleRemoveBlacklist = async (index) => {
    const blacklisted = league?.blacklisted_dates || [];
    const updated = blacklisted.filter((_, i) => i !== index);

    try {
      await updateLeagueMutation.mutateAsync({
        id: league.id,
        data: { blacklisted_dates: updated }
      });
    } catch (error) {
      toast.error('Failed to remove blacklisted dates');
    }
  };

  if (!league) return null;

  const blacklistedDates = league.blacklisted_dates || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Blacklisted Dates - {league.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Blacklist */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="font-medium">Add Blacklisted Period</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Christmas break, Maintenance"
              />
            </div>
            <Button 
              onClick={handleAddBlacklist}
              disabled={updateLeagueMutation.isPending}
              className="w-full"
            >
              {updateLeagueMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Blacklisted Period
            </Button>
          </div>

          {/* Current Blacklisted Dates */}
          <div>
            <Label className="font-medium mb-3 block">Current Blacklisted Periods</Label>
            {blacklistedDates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No blacklisted dates. Fixtures can be scheduled on any date.
              </p>
            ) : (
              <div className="space-y-2">
                {blacklistedDates.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {format(parseISO(entry.start_date), 'd MMM yyyy')} - {format(parseISO(entry.end_date), 'd MMM yyyy')}
                      </div>
                      {entry.reason && (
                        <div className="text-xs text-gray-500 mt-1">{entry.reason}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBlacklist(index)}
                      className="text-red-600 hover:text-red-700"
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