import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, UserPlus } from 'lucide-react';

/**
 * Modal for admin to manually add members as entrants.
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   competition: CompetitionRegistration object
 *   allMembers: ClubMembership[]
 *   existingEntries: CompetitionEntry[]  — entries already in this competition
 *   onAdd: (selectedEmails: string[]) => Promise<void>
 *   isAdding: boolean
 */
export default function AddEntrantsModal({ open, onClose, competition, allMembers, existingEntries, onAdd, isAdding }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const enteredEmails = useMemo(() => {
    const set = new Set();
    (existingEntries || []).forEach(e => {
      set.add(e.user_email);
      (e.team_members || []).forEach(m => set.add(m.email));
    });
    return set;
  }, [existingEntries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (allMembers || []).filter(m => {
      const name = (m.user_name || m.user_email || '').toLowerCase();
      return !q || name.includes(q);
    });
  }, [allMembers, search]);

  const toggle = (email) => {
    if (enteredEmails.has(email)) return; // already entered — ignore
    setSelected(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleClose = () => {
    setSearch('');
    setSelected([]);
    onClose();
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    await onAdd(selected);
    setSearch('');
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Add Entrants — {competition?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0" style={{ maxHeight: '320px' }}>
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No members found.</p>
            ) : (
              filtered.map(m => {
                const alreadyEntered = enteredEmails.has(m.user_email);
                const isChecked = selected.includes(m.user_email);
                return (
                  <div
                    key={m.user_email}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${alreadyEntered ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => toggle(m.user_email)}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={alreadyEntered}
                      onCheckedChange={() => toggle(m.user_email)}
                    />
                    <span className="text-sm flex-1">{m.user_name || m.user_email}</span>
                    {alreadyEntered && (
                      <Badge variant="outline" className="text-xs text-gray-400">Already entered</Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <p className="text-xs text-emerald-700 font-medium">
              {selected.length} member{selected.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleAdd}
            disabled={selected.length === 0 || isAdding}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Selected Entrants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}