import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock } from 'lucide-react';
import { toast } from "sonner";

const MODULE_LIST = [
  { key: 'module_rink_booking', label: 'Rink Booking' },
  { key: 'module_selection', label: 'Match Selection' },
  { key: 'module_competitions', label: 'Competitions' },
  { key: 'module_leagues', label: 'Leagues' },
  { key: 'module_sms_notifications', label: 'SMS Notifications' },
  { key: 'module_homepage', label: 'Club Homepage' },
  { key: 'module_function_rooms', label: 'Function Room Bookings' },
  { key: 'module_custom_branding', label: 'Custom Branding' },
  { key: 'module_accolades', label: 'Accolades' },
  { key: 'module_messaging', label: 'Club Messaging' },
];

export default function CreateFreeClubDialog({ open, onClose, user, onCreated }) {
  const [name, setName] = useState('');
  const [rinkCount, setRinkCount] = useState(6);
  const [openingTime, setOpeningTime] = useState('10:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a club name');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('createFreeClub', {
        name: name.trim(),
        rink_count: rinkCount,
        opening_time: openingTime,
        closing_time: closingTime,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Club created successfully!');
      onClose();
      setName('');
      setRinkCount(6);
      setOpeningTime('10:00');
      setClosingTime('21:00');
      if (onCreated && res.data?.club) onCreated(res.data.club);
    } catch (err) {
      toast.error(err.message || 'Failed to create club');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Create Your Club</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Club Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Springfield Bowls Club"
              required
            />
          </div>
          <div>
            <Label>Number of Rinks</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={rinkCount}
              onChange={(e) => setRinkCount(parseInt(e.target.value) || 6)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Opening Time</Label>
              <Input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
            </div>
            <div>
              <Label>Closing Time</Label>
              <Input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label className="text-base font-medium mb-1 block">Available Modules</Label>
            <p className="text-xs text-gray-500 mb-3">These features are available on the standard (paid) tier.</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {MODULE_LIST.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-normal text-gray-700">{label}</span>
                    <p className="text-xs text-gray-400">Not included in the Bowls Time free tier</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                    <Switch checked={false} disabled />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Club
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}