import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import ClubRoleCard from '@/components/club/ClubRoleCard';
import AddClubRoleDialog from '@/components/club/AddClubRoleDialog';
import { changeClubRole, memberDisplayName, roleLabel } from '@/lib/changeClubRole';

const ROLE_CARDS = [
  { role: 'admin', title: 'Admin', description: 'Full control of the club, including settings, members and roles.' },
  { role: 'secretary', title: 'Secretary', description: 'Recognised club officer role. Currently a label only, with no extra permissions.' },
  { role: 'selector', title: 'Selector', description: 'Can pick teams, view the competition interest summary and the selection audit log.' },
  { role: 'live_scorer', title: 'Live Scorer', description: 'Can enter and edit live match scores.' },
];

const INVALIDATE_KEYS = ['clubMembers', 'clubMemberships', 'myMembership', 'auditLogs'];

export default function ClubRolesSection({ clubId, currentUser }) {
  const queryClient = useQueryClient();
  const [addRole, setAddRole] = useState(null); // role string while the add dialog is open
  const [removeTarget, setRemoveTarget] = useState(null); // membership being demoted
  const [saving, setSaving] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const activeMembers = members.filter(m => m.member_status !== 'left');
  const membersWithRole = (role) => activeMembers.filter(m => (m.role || 'member') === role);

  const invalidateAll = () => {
    INVALIDATE_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleAddRole = async (membership) => {
    if (!membership || !addRole) return;
    setSaving(true);
    try {
      await changeClubRole({ membership, newRole: addRole, clubId, performedBy: currentUser });
      toast.success(`${memberDisplayName(membership)} is now a ${roleLabel(addRole)}`);
      setAddRole(null);
      invalidateAll();
    } catch (e) {
      toast.error(e.message || 'Failed to change role');
    }
    setSaving(false);
  };

  const handleRemoveRole = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      await changeClubRole({ membership: removeTarget, newRole: 'member', clubId, performedBy: currentUser });
      toast.success(`Removed ${roleLabel(removeTarget.role)} from ${memberDisplayName(removeTarget)}`);
      setRemoveTarget(null);
      invalidateAll();
    } catch (e) {
      toast.error(e.message || 'Failed to change role');
    }
    setSaving(false);
  };

  const isSelfAdmin = (member) =>
    member.user_email === currentUser?.email && (member.role || 'member') === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
      </div>
    );
  }

  const stewards = membersWithRole('steward');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Give club members an elevated role. Each member can hold one role at a time.
        </p>

        {ROLE_CARDS.map(def => (
          <ClubRoleCard
            key={def.role}
            title={def.title}
            description={def.description}
            members={membersWithRole(def.role)}
            onAdd={() => setAddRole(def.role)}
            onRemove={setRemoveTarget}
            isRemoveDisabled={isSelfAdmin}
            removeDisabledReason="You can't remove your own admin role"
          />
        ))}

        {stewards.length > 0 && (
          <ClubRoleCard
            title="Steward (legacy)"
            description="Legacy officer role, kept for members who held it before."
            members={stewards}
            onRemove={setRemoveTarget}
          />
        )}

        <AddClubRoleDialog
          open={!!addRole}
          onOpenChange={(open) => { if (!open) setAddRole(null); }}
          role={addRole}
          onRoleChange={setAddRole}
          allMembers={activeMembers}
          onConfirm={handleAddRole}
          saving={saving}
        />

        <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Remove {roleLabel(removeTarget?.role)} from {memberDisplayName(removeTarget)}?
              </DialogTitle>
              <DialogDescription>They will become a standard member.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleRemoveRole}
                disabled={saving}
              >
                Remove role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}