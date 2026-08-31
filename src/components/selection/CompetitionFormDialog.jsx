import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CompetitionFormDialog({ open, onClose, competition, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    season: 'indoor',
    gender: 'mixed',
    age_group: 'n/a',
    players_per_rink: 4,
    home_rinks: 2,
    away_rinks: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (competition) {
      setFormData({
        name: competition.name || '',
        season: competition.season || 'indoor',
        gender: competition.gender || 'mixed',
        age_group: competition.age_group || 'n/a',
        players_per_rink: competition.players_per_rink || 4,
        home_rinks: competition.home_rinks || 2,
        away_rinks: competition.away_rinks || 0,
      });
    } else {
      setFormData({
        name: '',
        season: 'indoor',
        gender: 'mixed',
        age_group: 'n/a',
        players_per_rink: 4,
        home_rinks: 2,
        away_rinks: 0,
      });
    }
  }, [competition, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Competition name is required');
      return;
    }
    setSaving(true);
    try {
      await onSaved({
        ...formData,
        players_per_rink: parseInt(formData.players_per_rink),
        home_rinks: parseInt(formData.home_rinks),
        away_rinks: parseInt(formData.away_rinks),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{competition ? 'Edit Competition' : 'Add Competition'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Wessex League" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Season</Label>
              <Select value={formData.season} onValueChange={(v) => setFormData({ ...formData, season: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Age Group</Label>
            <Select value={formData.age_group} onValueChange={(v) => setFormData({ ...formData, age_group: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="n/a">N/A</SelectItem>
                <SelectItem value="u25">U25</SelectItem>
                <SelectItem value="o60">O60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Players per Rink</Label>
              <Input type="number" value={formData.players_per_rink} onChange={(e) => setFormData({ ...formData, players_per_rink: e.target.value })} />
            </div>
            <div>
              <Label>Home Rinks</Label>
              <Input type="number" value={formData.home_rinks} onChange={(e) => setFormData({ ...formData, home_rinks: e.target.value })} />
            </div>
            <div>
              <Label>Away Rinks</Label>
              <Input type="number" value={formData.away_rinks} onChange={(e) => setFormData({ ...formData, away_rinks: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}