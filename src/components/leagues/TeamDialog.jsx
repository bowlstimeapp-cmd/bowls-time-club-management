import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from 'lucide-react';
import MemberSearchSelect from '@/components/member/MemberSearchSelect';
import { filterOutSocialMembers, normaliseMembershipTypes } from '@/lib/membershipUtils';

export default function TeamDialog({
  open,
  onClose,
  editingTeam,
  selectedLeague,
  teams,
  members,
  club,
  teamName,
  setTeamName,
  captainEmail,
  setCaptainEmail,
  onSave,
  isSaving,
}) {
  const [teamPlayers, setTeamPlayers] = useState([]);

  useEffect(() => {
    if (open) {
      setTeamPlayers(editingTeam?.players || []);
    }
  }, [open, editingTeam]);

  const selectableMembers = filterOutSocialMembers(members, normaliseMembershipTypes(club?.membership_types || []));

  // Emails taken by other teams in this league
  const otherTeams = teams.filter(t => t.league_id === selectedLeague?.id && t.id !== editingTeam?.id);
  const takenByOthers = new Set(otherTeams.flatMap(t => [t.captain_email, ...(t.players || [])]).filter(Boolean));

  const captainCandidates = selectableMembers.filter(m => !takenByOthers.has(m.user_email));
  const playerCandidates = selectableMembers.filter(m => !takenByOthers.has(m.user_email) && !teamPlayers.includes(m.user_email));

  const getPlayerName = (email) => {
    const m = members.find(x => x.user_email === email);
    if (m?.first_name && m?.surname) return `${m.first_name} ${m.surname}`;
    return m?.user_name || email;
  };

  const handleSave = () => {
    onSave(editingTeam ? teamPlayers : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTeam ? 'Edit Team' : `Add Team to ${selectedLeague?.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Team Name *</Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Team A"
            />
          </div>
          <div>
            <Label>Team Captain</Label>
            <MemberSearchSelect
              members={captainCandidates}
              value={captainEmail}
              onValueChange={(v) => setCaptainEmail(v || '')}
              placeholder="Select a captain (optional)"
              clearLabel="— No Captain —"
            />
          </div>

          {/* Players — only when editing */}
          {editingTeam && (
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="font-medium">Players ({teamPlayers.length})</Label>
              {teamPlayers.length > 0 && (
                <div className="space-y-1">
                  {teamPlayers.map(email => (
                    <div key={email} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded-lg text-sm">
                      <span>{getPlayerName(email)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                        onClick={() => setTeamPlayers(prev => prev.filter(e => e !== email))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {playerCandidates.length > 0 ? (
                <MemberSearchSelect
                  members={playerCandidates}
                  value={null}
                  onValueChange={(v) => {
                    if (v && !teamPlayers.includes(v)) {
                      setTeamPlayers(prev => [...prev, v]);
                    }
                  }}
                  placeholder="Add a player..."
                  clearLabel={null}
                />
              ) : teamPlayers.length === 0 ? (
                <p className="text-sm text-gray-400">No available members to add</p>
              ) : null}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingTeam ? 'Update' : 'Add Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}