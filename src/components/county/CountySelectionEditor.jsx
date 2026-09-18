import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Check } from 'lucide-react';

export default function CountySelectionEditor({ open, onOpenChange, selection, teams, members, saving, onSave }) {
  const [teamId, setTeamId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setTeamId(selection?.county_team_id || '');
      setMatchName(selection?.match_name || '');
      setMatchDate(selection?.match_date || '');
      setOpponent(selection?.opponent || '');
      setPlayers(selection?.selected_players || []);
      setSearch('');
    }
  }, [open, selection]);

  const togglePlayer = (email) =>
    setPlayers(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);

  const lower = search.toLowerCase();
  const filteredMembers = members.filter(m =>
    !search || m.name.toLowerCase().includes(lower) || m.email.toLowerCase().includes(lower)
  );

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
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="Search county members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">No members found.</p>
              ) : filteredMembers.map(m => (
                <button
                  key={m.email}
                  type="button"
                  onClick={() => togglePlayer(m.email)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  </div>
                  {players.includes(m.email) && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium shrink-0">
                      <Check className="w-4 h-4" /> Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
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