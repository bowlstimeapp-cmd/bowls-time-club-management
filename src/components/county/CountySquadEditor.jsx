import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CountyMemberPicker from '@/components/county/CountyMemberPicker';

export default function CountySquadEditor({ open, onOpenChange, squad, members, saving, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (open) {
      setName(squad?.name || '');
      setDescription(squad?.description || '');
      setPlayers(squad?.players || []);
    }
  }, [open, squad]);

  const togglePlayer = (email) =>
    setPlayers(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      squadId: squad?.id,
      data: { name: name.trim(), description: description || null, players },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{squad ? 'Edit Squad' : 'New Squad'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Squad Name *</Label>
            <Input placeholder="e.g. Senior Squad" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input placeholder="What this squad is for" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">Players ({players.length} selected)</Label>
            <CountyMemberPicker members={members} selected={players} onToggle={togglePlayer} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>Save Squad</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}