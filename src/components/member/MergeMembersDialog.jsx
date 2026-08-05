import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitMerge, ArrowRight, AlertTriangle, Loader2, Mail, Calendar, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function MergeMembersDialog({ open, onClose, sourceMember, targetMember, clubId, onMerged }) {
  // sourceMember = first selected (discarded), targetMember = second selected (kept)
  const [activity, setActivity] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (open && sourceMember && targetMember) {
      fetchCounts();
      setConfirmName('');
    }
  }, [open, sourceMember, targetMember]);

  const fetchCounts = async () => {
    setLoadingCounts(true);
    try {
      const [srcB, srcS, srcE, tgtB, tgtS, tgtE] = await Promise.all([
        base44.entities.Booking.filter({ booker_email: sourceMember.user_email, club_id: clubId }),
        base44.entities.TeamSelection.filter({ selector_email: sourceMember.user_email, club_id: clubId }),
        base44.entities.CompetitionEntry.filter({ user_email: sourceMember.user_email, club_id: clubId }),
        base44.entities.Booking.filter({ booker_email: targetMember.user_email, club_id: clubId }),
        base44.entities.TeamSelection.filter({ selector_email: targetMember.user_email, club_id: clubId }),
        base44.entities.CompetitionEntry.filter({ user_email: targetMember.user_email, club_id: clubId }),
      ]);
      setActivity({
        source: { bookings: srcB.length, selections: srcS.length, entries: srcE.length },
        target: { bookings: tgtB.length, selections: tgtS.length, entries: tgtE.length },
      });
    } catch (_e) {
      setActivity({ source: { bookings: 0, selections: 0, entries: 0 }, target: { bookings: 0, selections: 0, entries: 0 } });
    }
    setLoadingCounts(false);
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      const response = await base44.functions.invoke('mergeMembers', {
        clubId,
        sourceEmail: sourceMember.user_email,
        targetEmail: targetMember.user_email,
      });
      if (response.data?.partial) {
        toast.warning('Merge completed with some errors. Check the audit log for details.');
      } else {
        toast.success('Members merged successfully');
      }
      onMerged();
      onClose();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Unknown error';
      toast.error('Merge failed: ' + errMsg);
    }
    setMerging(false);
  };

  if (!sourceMember || !targetMember) return null;

  const targetName = (targetMember.user_name || targetMember.user_email || '').trim();
  const canMerge = confirmName.trim().toLowerCase() === targetName.toLowerCase();

  const ProfileCard = ({ member, isTarget, counts }) => (
    <div className={`rounded-xl border-2 p-4 ${isTarget ? 'border-emerald-300 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isTarget ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isTarget ? '✓ KEEPING' : '✗ DISCARDING'}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-slate-900">{member.user_name || '—'}</p>
        <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> {member.user_email}</p>
        <p className="text-sm text-slate-600 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /> Joined: {member.membership_start_date || '—'}</p>
        <p className="text-sm text-slate-600 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5 flex-shrink-0" /> Role: {member.role || 'member'}</p>
        {member.membership_groups?.length > 0 && (
          <p className="text-sm text-slate-600">Groups: {member.membership_groups.join(', ')}</p>
        )}
      </div>
      {counts && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Activity</p>
          <div className="flex gap-3 text-xs">
            <span className="text-slate-600">{counts.bookings} bookings</span>
            <span className="text-slate-600">{counts.selections} selections</span>
            <span className="text-slate-600">{counts.entries} entries</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Merge Member Profiles
          </DialogTitle>
          <DialogDescription>
            Merge two member profiles into one. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction indicator */}
          <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
            <span className="font-medium">{sourceMember.user_name || sourceMember.user_email}</span>
            <span className="text-slate-400">will be merged into</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-emerald-700">{targetMember.user_name || targetMember.user_email}</span>
          </div>

          {/* Profile comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileCard member={sourceMember} isTarget={false} counts={activity?.source} />
            <ProfileCard member={targetMember} isTarget={true} counts={activity?.target} />
          </div>

          {/* ELO warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">ELO rating history is not merged</p>
              <p className="text-amber-700">and will remain under the original profile. This is a known limitation.</p>
            </div>
          </div>

          {/* Cannot undo warning */}
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium">This cannot be undone.</p>
              <p className="text-red-700">ELO rating history will not be merged.</p>
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <Label className="text-sm font-medium text-slate-700">
              Type the surviving member's name to confirm: <span className="font-bold">{targetName}</span>
            </Label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={targetName}
              className="mt-1.5"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={merging}>Cancel</Button>
          <Button onClick={handleMerge} disabled={!canMerge || merging} className="bg-red-600 hover:bg-red-700 text-white">
            {merging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging...</> : <>Merge Profiles</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}