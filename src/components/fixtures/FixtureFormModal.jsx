import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FixtureFormModal({ open, onClose, fixture, competitions, clubId, onSaved }) {
  const [formData, setFormData] = useState({ competition_id: '', date: '', time: '', venue: 'Home', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fixture) {
      setFormData({
        competition_id: fixture.competition_id || '',
        date: fixture.date || '',
        time: fixture.time || '',
        venue: fixture.venue || 'Home',
        notes: fixture.notes || '',
      });
    } else {
      setFormData({ competition_id: '', date: '', time: '', venue: 'Home', notes: '' });
    }
  }, [fixture, open]);

  const handleSave = async () => {
    if (!formData.competition_id || !formData.date || !formData.time || !formData.venue) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (fixture) {
        const res = await base44.functions.invoke('updateFixture', { fixtureId: fixture.id, club_id: clubId, updates: formData });
        if (res.data.success) {
          toast.success('Fixture updated');
          onSaved();
          onClose();
        }
      } else {
        const res = await base44.functions.invoke('createFixture', { ...formData, club_id: clubId });
        if (res.data.success) {
          if (!res.data.draftSelectionCreated) {
            toast.warning(res.data.selectionMessage || 'No matching selection type found');
          } else {
            toast.success('Fixture created — draft selection generated');
          }
          onSaved();
          onClose();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save fixture');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fixture ? 'Edit Fixture' : 'Add Fixture'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Competition</Label>
            <Select value={formData.competition_id} onValueChange={(v) => setFormData({ ...formData, competition_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select competition" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  const clubComps = competitions.filter(c => c.club_id);
                  const platformComps = competitions.filter(c => !c.club_id);
                  return (
                    <>
                      {clubComps.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Club Competitions</SelectLabel>
                          {clubComps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectGroup>
                      )}
                      {platformComps.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Platform Competitions</SelectLabel>
                          {platformComps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectGroup>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
          </div>
          <div>
            <Label>Venue</Label>
            <Select value={formData.venue} onValueChange={(v) => setFormData({ ...formData, venue: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Away">Away</SelectItem>
                <SelectItem value="Home & Away">Home & Away</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
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