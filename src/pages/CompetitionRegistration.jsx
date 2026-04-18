import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Trophy, Plus, Calendar, Users, Loader2, CheckCircle, AlertCircle,
  MoreVertical, Pencil, Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';

const TYPE_LABELS = { singles: 'Singles', pairs: 'Pairs', triples: 'Triples', fours: 'Fours' };
const TYPE_COLORS = {
  singles: 'bg-blue-100 text-blue-800',
  pairs: 'bg-purple-100 text-purple-800',
  triples: 'bg-amber-100 text-amber-800',
  fours: 'bg-emerald-100 text-emerald-800',
};

// How many EXTRA players needed (besides the registrant)
const TEAM_EXTRAS = { singles: 0, pairs: 1, triples: 2, fours: 3 };

function isEntriesOpen(deadline) {
  if (!deadline) return true;
  const today = startOfDay(new Date());
  const dl = startOfDay(parseISO(deadline));
  return !isAfter(today, dl);
}

function formatPrice(price) {
  if (!price || price === 0) return 'Free';
  return `£${Number(price).toFixed(2)} per entry`;
}

function entryDisplayName(entry) {
  const names = [entry.member_name || entry.user_email];
  (entry.team_members || []).forEach(m => names.push(m.name || m.email));
  return names.join(' & ');
}

export default function CompetitionRegistration() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [selectedComp, setSelectedComp] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [teamSelections, setTeamSelections] = useState([]); // [{email, name}] for partners
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'singles', description: '', rules: '',
    max_entries: '', price_per_entry: '', registration_deadline: ''
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const m = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return m[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['compRegs', clubId],
    queryFn: () => base44.entities.CompetitionRegistration.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ['compEntries', clubId],
    queryFn: () => base44.entities.CompetitionEntry.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'steward';

  // My entries: entries where I'm the lead OR in team_members
  const myEntries = allEntries.filter(e =>
    e.user_email === user?.email ||
    (e.team_members || []).some(m => m.email === user?.email)
  );

  // Total cost — only count entries where I'm the lead (avoid double-counting)
  const totalCost = allEntries
    .filter(e => e.user_email === user?.email)
    .reduce((sum, entry) => {
      const comp = competitions.find(c => c.id === entry.competition_id);
      return sum + (comp?.price_per_entry || 0);
    }, 0);

  const createCompMutation = useMutation({
    mutationFn: (data) => base44.entities.CompetitionRegistration.create({ ...data, club_id: clubId, created_by: user?.email, status: 'open' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compRegs'] });
      toast.success('Competition published successfully');
      setAddModalOpen(false);
      setEditingComp(null);
      resetForm();
    },
  });

  const updateCompMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompetitionRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compRegs'] });
      toast.success('Competition updated');
      setAddModalOpen(false);
      setEditingComp(null);
      resetForm();
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (compId) => {
      const entries = allEntries.filter(e => e.competition_id === compId);
      for (const e of entries) {
        await base44.entities.CompetitionEntry.delete(e.id);
      }
      await base44.entities.CompetitionRegistration.delete(compId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compRegs'] });
      queryClient.invalidateQueries({ queryKey: ['compEntries'] });
      toast.success('Competition deleted');
      setDeleteConfirm(null);
      if (detailOpen) setDetailOpen(false);
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => base44.entities.CompetitionEntry.create({
      competition_id: selectedComp.id,
      club_id: clubId,
      user_email: user.email,
      member_name: myMembership?.user_name || user?.full_name || user?.email,
      team_members: teamSelections,
      entry_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compEntries'] });
      toast.success(`You have been registered for ${selectedComp.name}`);
      setRegisterOpen(false);
      setTeamSelections([]);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (entryId) => base44.entities.CompetitionEntry.delete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compEntries'] });
      toast.success('Your entry has been withdrawn');
      setWithdrawConfirm(null);
    },
  });

  const resetForm = () => setFormData({
    name: '', type: 'singles', description: '', rules: '',
    max_entries: '', price_per_entry: '', registration_deadline: ''
  });

  const handleOpenAdd = () => {
    setEditingComp(null);
    resetForm();
    setAddModalOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingComp(comp);
    setFormData({
      name: comp.name || '',
      type: comp.type || 'singles',
      description: comp.description || '',
      rules: comp.rules || '',
      max_entries: comp.max_entries || '',
      price_per_entry: comp.price_per_entry || '',
      registration_deadline: comp.registration_deadline || '',
    });
    setAddModalOpen(true);
  };

  const handleSaveComp = () => {
    if (!formData.name.trim()) { toast.error('Competition name is required'); return; }
    if (!formData.type) { toast.error('Type is required'); return; }
    if (!formData.max_entries || parseInt(formData.max_entries) < 1) { toast.error('Max entries must be at least 1'); return; }
    if (!formData.registration_deadline) { toast.error('Registration deadline is required'); return; }

    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description || null,
      rules: formData.rules || null,
      max_entries: parseInt(formData.max_entries),
      price_per_entry: formData.price_per_entry ? parseFloat(formData.price_per_entry) : 0,
      registration_deadline: formData.registration_deadline,
    };

    if (editingComp) {
      updateCompMutation.mutate({ id: editingComp.id, data: payload });
    } else {
      createCompMutation.mutate(payload);
    }
  };

  const handleOpenRegister = (comp) => {
    setSelectedComp(comp);
    const extras = TEAM_EXTRAS[comp.type] || 0;
    setTeamSelections(Array(extras).fill(null).map(() => ({ email: '', name: '' })));
    setRegisterOpen(true);
  };

  const handleTeamMemberChange = (index, email) => {
    const member = allMembers.find(m => m.user_email === email);
    setTeamSelections(prev => {
      const next = [...prev];
      next[index] = { email, name: member?.user_name || email };
      return next;
    });
  };

  const handleRegisterSubmit = () => {
    const extras = TEAM_EXTRAS[selectedComp?.type] || 0;
    for (let i = 0; i < extras; i++) {
      if (!teamSelections[i]?.email) {
        toast.error(`Please select all team members`);
        return;
      }
    }
    // Check for duplicates
    const allSelected = [user?.email, ...teamSelections.map(m => m.email)];
    if (new Set(allSelected).size !== allSelected.length) {
      toast.error('You cannot select the same person twice');
      return;
    }
    registerMutation.mutate();
  };

  const sortedComps = [...competitions].sort((a, b) => {
    if (!a.registration_deadline) return 1;
    if (!b.registration_deadline) return -1;
    return a.registration_deadline.localeCompare(b.registration_deadline);
  });

  const selectedEntries = selectedComp
    ? allEntries.filter(e => e.competition_id === selectedComp.id)
    : [];

  // Find MY entry for the selected comp — I'm the lead entrant
  const mySelectedEntry = selectedComp
    ? allEntries.find(e => e.competition_id === selectedComp.id && e.user_email === user?.email)
    : null;

  // Or I'm a team member in someone else's entry
  const myTeamEntry = selectedComp && !mySelectedEntry
    ? allEntries.find(e => e.competition_id === selectedComp.id && (e.team_members || []).some(m => m.email === user?.email))
    : null;

  const isOpen = selectedComp ? isEntriesOpen(selectedComp.registration_deadline) : false;
  const isFull = selectedComp ? (selectedEntries.length >= (selectedComp.max_entries || Infinity)) : false;

  const isEnteredInComp = !!(mySelectedEntry || myTeamEntry);

  // Available members for team selection (exclude self and already selected)
  const availableMembers = allMembers.filter(m => m.user_email !== user?.email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Competition Registration</h1>
          <p className="text-gray-600">{club?.name}</p>
        </motion.div>

        {/* Page Header Message */}
        {club?.competition_page_header && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm whitespace-pre-wrap">
              {club.competition_page_header}
            </div>
          </motion.div>
        )}

        {/* My Entries Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                My Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myEntries.length === 0 ? (
                <p className="text-sm text-gray-500">You have no current entries.</p>
              ) : (
                <ul className="space-y-2 mb-3">
                  {myEntries.map(entry => {
                    const comp = competitions.find(c => c.id === entry.competition_id);
                    if (!comp) return null;
                    const isLead = entry.user_email === user?.email;
                    return (
                      <li key={entry.id} className="text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{comp.name}</span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="capitalize text-gray-500">{TYPE_LABELS[comp.type]}</span>
                            {(entry.team_members || []).length > 0 && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Team: {entryDisplayName(entry)}
                                {!isLead && <span className="text-amber-600 ml-1">(entered by {entry.member_name || entry.user_email})</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-sm font-medium text-gray-700">
                Total entry cost:{' '}
                {totalCost === 0
                  ? <span className="text-emerald-600">Free</span>
                  : <span className="text-emerald-600">£{totalCost.toFixed(2)}</span>
                }
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Competitions List */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Competitions</h2>
            {isAdmin && (
              <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Competition
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : sortedComps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No competitions available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedComps.map(comp => {
                const open = isEntriesOpen(comp.registration_deadline);
                const entryCount = allEntries.filter(e => e.competition_id === comp.id).length;
                const full = entryCount >= (comp.max_entries || Infinity);
                const myEntry = allEntries.find(e =>
                  e.competition_id === comp.id &&
                  (e.user_email === user?.email || (e.team_members || []).some(m => m.email === user?.email))
                );
                return (
                  <Card key={comp.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{comp.name}</h3>
                            <Badge className={TYPE_COLORS[comp.type]}>{TYPE_LABELS[comp.type]}</Badge>
                            {open ? (
                              <Badge className="bg-emerald-100 text-emerald-800">Entries Open</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">Entries Closed</Badge>
                            )}
                            {myEntry && (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">You are entered</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {comp.registration_deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Closes {format(parseISO(comp.registration_deadline), 'd MMM yyyy')}
                              </span>
                            )}
                            <span>{formatPrice(comp.price_per_entry)}</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {entryCount} / {comp.max_entries} entered
                              {full && <span className="text-red-600 font-medium ml-1">(Full)</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedComp(comp); setDetailOpen(true); }}
                          >
                            View Details
                          </Button>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(comp)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeleteConfirm(comp)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedComp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  {selectedComp.name}
                  <Badge className={TYPE_COLORS[selectedComp.type]}>{TYPE_LABELS[selectedComp.type]}</Badge>
                  {isOpen ? (
                    <Badge className="bg-emerald-100 text-emerald-800">Entries Open</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Entries Closed</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {selectedComp.registration_deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Closes {format(parseISO(selectedComp.registration_deadline), 'd MMMM yyyy')}
                    </span>
                  )}
                  <span>{formatPrice(selectedComp.price_per_entry)}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {selectedEntries.length} / {selectedComp.max_entries} entered
                  </span>
                </div>

                {selectedComp.description && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedComp.description}</p>
                  </div>
                )}

                {selectedComp.rules && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Rules & Conditions</p>
                    <div className="max-h-36 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedComp.rules}
                    </div>
                  </div>
                )}

                {/* Entrants */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Entrants ({selectedEntries.length})
                  </p>
                  {selectedEntries.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No entries yet — be the first to enter.</p>
                  ) : (
                    <ol className="space-y-1">
                      {selectedEntries.map((entry, i) => {
                        const isMe = entry.user_email === user?.email || (entry.team_members || []).some(m => m.email === user?.email);
                        return (
                          <li key={entry.id} className="text-sm text-gray-700 flex items-center gap-2">
                            <span className="text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                            <span>{entryDisplayName(entry)}</span>
                            {isMe && <span className="text-xs text-emerald-600 font-medium">(you)</span>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                {/* Register / Withdraw */}
                <div className="pt-2 border-t">
                  {!isOpen ? null : isEnteredInComp ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                        <CheckCircle className="w-4 h-4" />
                        You are entered
                        {myTeamEntry && <span className="font-normal text-gray-500 ml-1">(as part of a team)</span>}
                      </div>
                      {mySelectedEntry && (
                        <button
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => setWithdrawConfirm(mySelectedEntry)}
                        >
                          Withdraw Entry
                        </button>
                      )}
                    </div>
                  ) : isFull ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Competition Full
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => { setDetailOpen(false); handleOpenRegister(selectedComp); }}
                    >
                      Register for this Competition
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Register Modal (with team member selection) */}
      <Dialog open={registerOpen} onOpenChange={(open) => { if (!open) { setRegisterOpen(false); setTeamSelections([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register: {selectedComp?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Lead member (self) */}
            <div>
              <Label className="text-sm text-gray-600">Your name</Label>
              <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-800 border">
                {myMembership?.user_name || user?.full_name || user?.email}
              </div>
            </div>

            {/* Partner selectors */}
            {teamSelections.map((selection, i) => {
              const selectedEmailsExcludingThisSlot = [
                user?.email,
                ...teamSelections.filter((_, j) => j !== i).map(m => m?.email).filter(Boolean)
              ];
              const options = availableMembers.filter(m => !selectedEmailsExcludingThisSlot.includes(m.user_email));
              const label = selectedComp?.type === 'pairs' ? 'Partner' :
                selectedComp?.type === 'triples' ? `Player ${i + 2}` :
                `Player ${i + 2}`;
              return (
                <div key={i}>
                  <Label className="text-sm text-gray-600">{label} *</Label>
                  <Select
                    value={selection?.email || ''}
                    onValueChange={(v) => handleTeamMemberChange(i, v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map(m => (
                        <SelectItem key={m.user_email} value={m.user_email}>
                          {m.user_name || m.user_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            {selectedComp?.price_per_entry > 0 && (
              <p className="text-sm text-gray-500">
                Entry fee: <span className="font-medium text-gray-800">{formatPrice(selectedComp.price_per_entry)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRegisterOpen(false); setTeamSelections([]); }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleRegisterSubmit}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Competition Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingComp ? 'Edit Competition' : 'Add New Competition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Competition Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Club Singles Championship" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="singles">Singles</SelectItem>
                  <SelectItem value="pairs">Pairs</SelectItem>
                  <SelectItem value="triples">Triples</SelectItem>
                  <SelectItem value="fours">Fours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Optional description..." />
            </div>
            <div>
              <Label>Rules & Conditions</Label>
              <Textarea value={formData.rules} onChange={e => setFormData({ ...formData, rules: e.target.value })} rows={4} placeholder="Enter any rules, conditions, or eligibility requirements" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Entries *</Label>
                <Input type="number" min="1" value={formData.max_entries} onChange={e => setFormData({ ...formData, max_entries: e.target.value })} placeholder="e.g. 32" />
              </div>
              <div>
                <Label>£ per entry</Label>
                <Input type="number" min="0" step="0.01" value={formData.price_per_entry} onChange={e => setFormData({ ...formData, price_per_entry: e.target.value })} placeholder="0 if free" />
              </div>
            </div>
            <div>
              <Label>Registration Deadline *</Label>
              <Input type="date" value={formData.registration_deadline} onChange={e => setFormData({ ...formData, registration_deadline: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); setEditingComp(null); resetForm(); }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveComp}
              disabled={createCompMutation.isPending || updateCompMutation.isPending}
            >
              {(createCompMutation.isPending || updateCompMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingComp ? 'Update' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Confirm */}
      <Dialog open={!!withdrawConfirm} onOpenChange={() => setWithdrawConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Are you sure you want to withdraw from <strong>{selectedComp?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => withdrawMutation.mutate(withdrawConfirm.id)}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            This will also remove all entries. Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteCompMutation.mutate(deleteConfirm.id)}
              disabled={deleteCompMutation.isPending}
            >
              {deleteCompMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}