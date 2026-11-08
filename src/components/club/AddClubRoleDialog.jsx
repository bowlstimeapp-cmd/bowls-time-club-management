import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberSearchSelect from '@/components/member/MemberSearchSelect';
import { ROLE_LABELS, memberDisplayName } from '@/lib/changeClubRole';

const ASSIGNABLE_ROLES = ['admin', 'secretary', 'selector', 'live_scorer'];

export default function AddClubRoleDialog({ open, onOpenChange, role, onRoleChange, allMembers, onConfirm, saving }) {
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    if (open) setSelectedEmail('');
  }, [open, role]);

  // Only members who do not already hold the selected role can be picked
  const selectableMembers = (allMembers || []).filter(m => (m.role || 'member') !== role);
  const selectedMember = (allMembers || []).find(m => m.user_email === selectedEmail);
  const currentRole = selectedMember?.role || 'member';
  const willReplace = !!selectedMember && currentRole !== 'member' && currentRole !== role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a club role</DialogTitle>
          <DialogDescription>
            Each member can hold one role. Changing it replaces their current one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-600">Role</Label>
            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Member</Label>
            <MemberSearchSelect
              members={selectableMembers}
              value={selectedEmail}
              onValueChange={(email) => setSelectedEmail(email || '')}
              placeholder="Select a member"
              clearLabel="— None —"
            />
          </div>

          {willReplace && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <p>
                <span className="font-medium">{memberDisplayName(selectedMember)}</span> is currently a{' '}
                {ROLE_LABELS[currentRole]}. Adding this role will replace it, as a member can only hold one role.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!selectedMember || saving}
            onClick={() => onConfirm(selectedMember)}
          >
            Add Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}