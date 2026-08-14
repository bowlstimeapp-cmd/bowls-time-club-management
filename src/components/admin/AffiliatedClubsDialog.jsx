import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, X, Loader2, Link2 } from 'lucide-react';
import { toast } from "sonner";

export default function AffiliatedClubsDialog({ club, allClubs = [], open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const affiliatedIds = Array.isArray(club?.affiliated_club_ids) ? club.affiliated_club_ids : [];
  const affiliatedClubs = affiliatedIds
    .map(id => allClubs.find(c => c.id === id))
    .filter(Boolean);

  const availableClubs = allClubs.filter(c =>
    c.id !== club?.id &&
    !affiliatedIds.includes(c.id) &&
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (otherClub) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('setClubAffiliation', {
        clubIdA: club.id,
        clubIdB: otherClub.id,
        action: 'add',
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['allClubs'] });
      toast.success(`${otherClub.name} is now affiliated with ${club.name}`);
      setSearch('');
    } catch (err) {
      toast.error('Failed to add affiliation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (otherClub) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('setClubAffiliation', {
        clubIdA: club.id,
        clubIdB: otherClub.id,
        action: 'remove',
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['allClubs'] });
      toast.success(`Removed affiliation with ${otherClub.name}`);
    } catch (err) {
      toast.error('Failed to remove affiliation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            Affiliated Clubs — {club?.name}
          </DialogTitle>
          <DialogDescription>
            Affiliated clubs share rink visibility and clash detection. Their bookings appear on this club's diary, and new bookings check for conflicts across both clubs.
          </DialogDescription>
        </DialogHeader>

        {/* Currently affiliated */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Currently affiliated</div>
          {affiliatedClubs.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No affiliated clubs yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {affiliatedClubs.map(ac => (
                <Badge key={ac.id} variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-emerald-200 text-emerald-800">
                  <Building2 className="w-3.5 h-3.5" />
                  {ac.name}
                  <button
                    onClick={() => handleRemove(ac)}
                    disabled={saving}
                    className="ml-0.5 text-emerald-500 hover:text-red-600 disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Add new affiliation */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium text-gray-700">Add a club</div>
          <Input
            placeholder="Search clubs by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={saving}
          />
          {search && availableClubs.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-1">
              {availableClubs.slice(0, 10).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c)}
                  disabled={saving}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-left disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium truncate flex-1">{c.name}</span>
                  <Plus className="w-4 h-4 text-emerald-600" />
                </button>
              ))}
            </div>
          )}
          {search && availableClubs.length === 0 && (
            <p className="text-sm text-gray-400 italic px-1">No clubs found matching "{search}".</p>
          )}
        </div>

        {saving && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Updating affiliations…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}