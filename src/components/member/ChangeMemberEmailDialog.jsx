import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AtSign, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangeMemberEmailDialog({ open, onClose, member, clubId, isClubAdmin, onComplete }) {
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNewEmail('');
  }, [open]);

  if (!member) return null;

  const handleSubmit = async () => {
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (email.toLowerCase() === (member.user_email || '').toLowerCase()) {
      toast.error('New email is the same as the current one');
      return;
    }
    setSaving(true);
    try {
      const response = await base44.functions.invoke('updateMemberEmail', {
        clubId,
        membershipId: member.id,
        newEmail: email,
      });
      if (response.data?.partial) {
        toast.warning('Email updated with some errors — check the audit log for details.');
      } else {
        toast.success('Member email updated');
      }
      if (onComplete) onComplete();
      onClose();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Unknown error';
      toast.error('Failed to update email: ' + errMsg);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AtSign className="w-5 h-5 text-emerald-600" />
            Change Member Email
          </DialogTitle>
          <DialogDescription>
            Update the email address used for this member across all club records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <p className="text-sm font-medium text-slate-900">{member.user_name || '—'}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              {member.user_email}
            </p>
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">New Email Address *</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="member@example.com"
              className="rounded-xl"
            />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              This updates the member's email on their membership, bookings, teams, entries and other club records.
              If this member already signs in with their old email, their sign-in account is not changed.
              {isClubAdmin && ' This only updates this club\u2019s records. The member will still sign in with their old email unless their login is changed separately.'}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AtSign className="w-4 h-4 mr-2" />}
            {saving ? 'Updating...' : 'Update Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}