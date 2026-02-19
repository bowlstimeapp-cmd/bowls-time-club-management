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

export default function PlayerAvailabilityDialog({ open, onClose, team, getMemberName }) {
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [unavailableDate, setUnavailableDate] = useState('');

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeagueTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams'] });
      toast.success('Availability updated');
    },
  });

  const handleAddUnavailability = () => {
    if (!selectedPlayer || !unavailableDate) {
      toast.error('Please select a player and date');
      return;
    }

    const unavailability = team?.player_unavailability || {};
    const playerDates = unavailability[selectedPlayer] || [];

    if (playerDates.includes(unavailableDate)) {
      toast.error('Date already marked unavailable');
      return;
    }

    const updated = {
      ...unavailability,
      [selectedPlayer]: [...playerDates, unavailableDate].sort()
    };

    updateTeamMutation.mutate({
      id: team.id,
      data: { player_unavailability: updated }
    });

    setUnavailableDate('');
  };

  const handleRemoveUnavailability = (playerEmail, date) => {
    const unavailability = team?.player_unavailability || {};
    const playerDates = (unavailability[playerEmail] || []).filter(d => d !== date);

    const updated = {
      ...unavailability,
      [playerEmail]: playerDates
    };

    updateTeamMutation.mutate({
      id: team.id,
      data: { player_unavailability: updated }
    });
  };

  if (!team) return null;

  const players = team.players || [];
  const unavailability = team.player_unavailability || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Manage Player Availability - {team.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Unavailability */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="font-medium">Mark Player Unavailable</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select player...</option>
                {players.map(email => (
                  <option key={email} value={email}>
                    {getMemberName(email)}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={unavailableDate}
                onChange={(e) => setUnavailableDate(e.target.value)}
              />
              <Button 
                onClick={handleAddUnavailability}
                disabled={updateTeamMutation.isPending}
                size="sm"
              >
                {updateTeamMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Unavailability */}
          <div>
            <Label className="font-medium mb-3 block">Current Unavailability</Label>
            {players.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No players in team</p>
            ) : (
              <div className="space-y-3">
                {players.map(playerEmail => {
                  const dates = unavailability[playerEmail] || [];
                  return (
                    <div key={playerEmail} className="border rounded-lg p-3">
                      <div className="font-medium text-sm mb-2">
                        {getMemberName(playerEmail)}
                      </div>
                      {dates.length === 0 ? (
                        <p className="text-xs text-gray-400">No unavailable dates</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {dates.map(date => (
                            <Badge 
                              key={date} 
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {format(parseISO(date), 'd MMM yyyy')}
                              <button
                                onClick={() => handleRemoveUnavailability(playerEmail, date)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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