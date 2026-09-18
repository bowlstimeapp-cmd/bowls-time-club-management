import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CountyMemberPicker from '@/components/county/CountyMemberPicker';

export default function CountySelectionEditor({ open, onOpenChange, selection, teams, squads = [], members, saving, onSave }) {
  const [teamId, setTeamId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [players, setPlayers] = useState([]);
  const [squadFilter, setSquadFilter] = useState('all');

  useEffect(() => {
    if (open) {
      setTeamId(selection?.county_team_id || '');
      setMatchName(selection?.match_name || '');
      setMatchDate(selection?.match_date || '');
      setOpponent(selection?.opponent || '');
      setPlayers(selection?.selected_players || []);
      setSquadFilter('all');
    }
  }, [open, selection]);

  const togglePlayer = (email) =>
    setPlayers(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);

  const squadPlayerEmails = squadFilter === 'all'
    ? null
    : (squads.find(s => s.id === squadFilter)?.players || []);
  const selectableMembers = squadPlayerEmails
    ? members.filter(m => squadPlayerEmails.includes(m.email))
    : members;

  const submit = (status) => {
    if (!teamId) return;
    onSave({
      selectionId: selection?.id,
      data: {
        county_team_id: teamId,
        match_name: matchName || null,
        match_date: matchDate || null,
        opponent: opponent || null,
        selected_players: players,
        status,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selection ? 'Edit Selection' : 'New County Selection'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Representative Team *</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Choose a team" /></SelectTrigger>
              <SelectContent>
                {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Match Date</Label>
              <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            </div>
            <div>
              <Label>Opponent</Label>
              <Input placeholder="Opponent county or team" value={opponent} onChange={e => setOpponent(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Match Name (optional)</Label>
            <Input placeholder="e.g. Middleton Cup Round 1" value={matchName} onChange={e => setMatchName(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2 block">Players ({players.length} selected)</Label>
            <Select value={squadFilter} onValueChange={setSquadFilter}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Choose players from..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All county members</SelectItem>
                {squads.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CountyMemberPicker
              members={selectableMembers}
              selected={players}
              onToggle={togglePlayer}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={() => submit('draft')} disabled={saving || !teamId}>Save Draft</Button>
          <Button onClick={() => submit('published')} disabled={saving || !teamId}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}