import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus } from 'lucide-react';

// How many extra team members (beyond the lead) are needed
const TEAM_EXTRAS = { singles: 0, pairs: 1, triples: 2, fours: 3 };

/**
 * Modal for admin to manually add members as entrants.
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   competition: CompetitionRegistration object
 *   allMembers: ClubMembership[]
 *   existingEntries: CompetitionEntry[]  — entries already in this competition
 *   onAdd: (payload) => Promise<void>
 *     For singles/fours: payload = { emails: string[] }
 *     For pairs/triples: payload = { teamEntry: { leadEmail, teamMembers: [{email, name}] } }
 *   isAdding: boolean
 */
export default function AddEntrantsModal({ open, onClose, competition, allMembers, existingEntries, onAdd, isAdding }) {
  const compType = competition?.type || 'singles';
  const extras = TEAM_EXTRAS[compType] ?? 0;
  const isTeamEntry = extras > 0;

  // Singles/fours: multi-select checkboxes
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  // Pairs/triples: lead + team member dropdowns
  const [leadEmail, setLeadEmail] = useState('');
  const [teamSlots, setTeamSlots] = useState([]); // [{email, name}]

  // Reset on open/competition change
  useEffect(() => {
    setSearch('');
    setSelected([]);
    setLeadEmail('');
    setTeamSlots(Array(extras).fill(null).map(() => ({ email: '', name: '' })));
  }, [open, competition?.id, extras]);

  // Build set of already-entered emails (lead or team member)
  const enteredEmails = useMemo(() => {
    const set = new Set();
    (existingEntries || []).forEach(e => {
      set.add(e.user_email);
      (e.team_members || []).forEach(m => set.add(m.email));
    });
    return set;
  }, [existingEntries]);

  const approvedMembers = useMemo(() => (allMembers || []).filter(m => m.status === 'approved' || !m.status), [allMembers]);

  // ─── Singles / Fours: checkbox list ───
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return approvedMembers.filter(m => {
      const name = (m.user_name || m.user_email || '').toLowerCase();
      return !q || name.includes(q);
    });
  }, [approvedMembers, search]);

  const toggle = (email) => {
    if (enteredEmails.has(email)) return;
    setSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  // ─── Pairs / Triples: dropdown selectors ───
  const handleSlotChange = (index, email) => {
    const member = approvedMembers.find(m => m.user_email === email);
    setTeamSlots(prev => {
      const next = [...prev];
      next[index] = { email, name: member?.user_name || email };
      return next;
    });
  };

  // Members available for each slot (exclude already-entered, lead, and other slots)
  const getSlotOptions = (slotIndex) => {
    const usedEmails = new Set([
      leadEmail,
      ...teamSlots.filter((_, j) => j !== slotIndex).map(s => s.email).filter(Boolean),
    ]);
    return approvedMembers.filter(m => !usedEmails.has(m.user_email));
  };

  const getLeadOptions = () => {
    const usedEmails = new Set(teamSlots.map(s => s.email).filter(Boolean));
    return approvedMembers.filter(m => !usedEmails.has(m.user_email));
  };

  const handleClose = () => {
    setSearch('');
    setSelected([]);
    setLeadEmail('');
    setTeamSlots(Array(extras).fill(null).map(() => ({ email: '', name: '' })));
    onClose();
  };

  const isTeamValid = leadEmail && teamSlots.every(s => !!s.email) &&
    new Set([leadEmail, ...teamSlots.map(s => s.email)]).size === 1 + teamSlots.length;

  const handleAdd = async () => {
    if (isTeamEntry) {
      if (!isTeamValid) return;
      await onAdd({ teamEntry: { leadEmail, teamMembers: teamSlots } });
    } else {
      if (selected.length === 0) return;
      await onAdd({ emails: selected });
    }
    handleClose();
  };

  const slotLabel = (i) => {
    if (compType === 'pairs') return 'Partner';
    if (compType === 'triples') return i === 0 ? 'Second Player' : 'Third Player';
    return `Player ${i + 2}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Add Entry — {competition?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {isTeamEntry ? (
            // ─── Pairs / Triples: select the full team ───
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Select the {compType === 'pairs' ? '2 players' : '3 players'} for this entry.
              </p>

              {/* Lead */}
              <div>
                <Label className="text-sm text-gray-600">Lead Player *</Label>
                <Select value={leadEmail} onValueChange={setLeadEmail}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select lead player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getLeadOptions().map(m => (
                      <SelectItem
                        key={m.user_email}
                        value={m.user_email}
                        disabled={enteredEmails.has(m.user_email)}
                      >
                        {m.user_name || m.user_email}
                        {enteredEmails.has(m.user_email) && ' (already entered)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Extra slots */}
              {teamSlots.map((slot, i) => (
                <div key={i}>
                  <Label className="text-sm text-gray-600">{slotLabel(i)} *</Label>
                  <Select value={slot.email} onValueChange={(v) => handleSlotChange(i, v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Select ${slotLabel(i).toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getSlotOptions(i).map(m => (
                        <SelectItem
                          key={m.user_email}
                          value={m.user_email}
                          disabled={enteredEmails.has(m.user_email)}
                        >
                          {m.user_name || m.user_email}
                          {enteredEmails.has(m.user_email) && ' (already entered)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : (
            // ─── Singles / Fours: checkbox multi-select ───
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search members..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

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
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleAdd}
            disabled={isTeamEntry ? !isTeamValid : selected.length === 0 || isAdding}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isTeamEntry ? 'Add Team Entry' : 'Add Selected Entrants'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}