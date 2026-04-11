import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, Plus, Trash2, Pencil, X, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EMOJI_OPTIONS = ['🏆', '🥇', '🥈', '🥉', '⭐', '🎖️', '🏅', '👑', '🎯', '🌟', '💎', '🔥', '🎪', '🎉', '🏵️', '⚡'];

export default function AccoladesSection({ clubId, moduleEnabled, onToggleModule, members = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccolade, setEditingAccolade] = useState(null);
  const [form, setForm] = useState({ name: '', emoji: '🏆', description: '', allow_multiple_winners: true });
  const [assigningAccolade, setAssigningAccolade] = useState(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignDate, setAssignDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [memberSearch, setMemberSearch] = useState('');

  const { data: accolades = [] } = useQuery({
    queryKey: ['clubAccolades', clubId],
    queryFn: () => base44.entities.ClubAccolade.filter({ club_id: clubId }),
    enabled: !!clubId && moduleEnabled,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['clubAccoladeAssignments', clubId],
    queryFn: () => base44.entities.ClubAccoladeAssignment.filter({ club_id: clubId }),
    enabled: !!clubId && moduleEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubAccolade.create({ ...data, club_id: clubId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAccolades', clubId] }); toast.success('Accolade created'); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubAccolade.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAccolades', clubId] }); toast.success('Accolade updated'); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubAccolade.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAccolades', clubId] }); toast.success('Accolade deleted'); },
  });

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubAccoladeAssignment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAccoladeAssignments', clubId] }); toast.success('Accolade awarded!'); setAssignEmail(''); },
  });

  const revokeAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.ClubAccoladeAssignment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clubAccoladeAssignments', clubId] }); toast.success('Assignment removed'); },
  });

  const resetForm = () => {
    setForm({ name: '', emoji: '🏆', description: '', allow_multiple_winners: true });
    setEditingAccolade(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Please enter a name'); return; }
    if (editingAccolade) {
      updateMutation.mutate({ id: editingAccolade.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (accolade) => {
    setEditingAccolade(accolade);
    setForm({ name: accolade.name, emoji: accolade.emoji || '🏆', description: accolade.description || '', allow_multiple_winners: accolade.allow_multiple_winners !== false });
    setShowForm(true);
    setAssigningAccolade(null);
  };

  const handleAssign = (accolade) => {
    setAssigningAccolade(accolade);
    setAssignEmail('');
    setMemberSearch('');
    setShowForm(false);
    setEditingAccolade(null);
  };

  const doAssign = () => {
    if (!assignEmail) { toast.error('Please select a member'); return; }
    assignMutation.mutate({
      club_id: clubId,
      accolade_id: assigningAccolade.id,
      user_email: assignEmail,
      awarded_date: assignDate,
    });
  };

  const getAssignmentsForAccolade = (accoladeId) => assignments.filter(a => a.accolade_id === accoladeId);

  const getMemberName = (email) => {
    const m = members.find(mb => mb.user_email === email);
    return m?.first_name && m?.surname ? `${m.first_name} ${m.surname}` : m?.user_name || email;
  };

  // Group assignments by user to show count
  const groupAssignments = (accoladeAssignments) => {
    const groups = {};
    accoladeAssignments.forEach(a => {
      if (!groups[a.user_email]) groups[a.user_email] = [];
      groups[a.user_email].push(a);
    });
    return groups;
  };

  const filteredMembers = members.filter(m => {
    const name = getMemberName(m.user_email).toLowerCase();
    return name.includes(memberSearch.toLowerCase()) || m.user_email.toLowerCase().includes(memberSearch.toLowerCase());
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5" />
              Accolades
            </CardTitle>
            <CardDescription>Award badges and honours to club members</CardDescription>
          </div>
          <Switch checked={moduleEnabled} onCheckedChange={onToggleModule} />
        </div>
      </CardHeader>

      {moduleEnabled && (
        <CardContent className="space-y-4">
          {/* Accolade list */}
          {accolades.length === 0 && !showForm ? (
            <div className="py-6 text-center text-gray-500">
              <Medal className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No accolades defined yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accolades.map(accolade => {
                const accoladeAssignments = getAssignmentsForAccolade(accolade.id);
                const grouped = groupAssignments(accoladeAssignments);
                const isAssigning = assigningAccolade?.id === accolade.id;

                return (
                  <div key={accolade.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{accolade.emoji || '🏆'}</span>
                        <div>
                          <p className="font-medium text-gray-900">{accolade.name}</p>
                          {accolade.description && <p className="text-xs text-gray-500">{accolade.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {accolade.allow_multiple_winners ? 'Multiple winners allowed' : 'Single winner'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleAssign(accolade)}>
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleEdit(accolade)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(accolade.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Current holders */}
                    {Object.keys(grouped).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t">
                        {Object.entries(grouped).map(([email, rows]) => (
                          <div key={email} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                            <span className="text-xs font-medium text-amber-800">{getMemberName(email)}</span>
                            {rows.length > 1 && (
                              <span className="text-xs font-bold text-amber-600 bg-amber-200 rounded-full px-1.5">{rows.length}x</span>
                            )}
                            <button
                              type="button"
                              onClick={() => revokeAssignmentMutation.mutate(rows[rows.length - 1].id)}
                              className="ml-1 text-amber-500 hover:text-red-500"
                              title="Remove one award"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assign panel */}
                    {isAssigning && (
                      <div className="pt-2 border-t space-y-2">
                        <p className="text-sm font-medium text-gray-700">Award to a member</p>
                        <Input
                          placeholder="Search members..."
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          className="text-sm"
                        />
                        <Select value={assignEmail} onValueChange={setAssignEmail}>
                          <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                          <SelectContent>
                            {filteredMembers.map(m => (
                              <SelectItem key={m.user_email} value={m.user_email}>
                                {getMemberName(m.user_email)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={doAssign} disabled={assignMutation.isPending}>
                            <Check className="w-4 h-4 mr-1" />Award
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setAssigningAccolade(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add/Edit form */}
          {showForm ? (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="font-medium text-gray-800">{editingAccolade ? 'Edit Accolade' : 'New Accolade'}</p>
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Club Champion" />
              </div>
              <div>
                <Label>Emoji Icon</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm({ ...form, emoji })}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${form.emoji === emoji ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this accolade for?" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Allow Multiple Winners</Label>
                  <p className="text-xs text-gray-500">If off, only one player holds this accolade at a time</p>
                </div>
                <Switch checked={form.allow_multiple_winners} onCheckedChange={v => setForm({ ...form, allow_multiple_winners: v })} />
              </div>
              <div className="flex gap-2">
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
                  <Check className="w-4 h-4 mr-1" />{editingAccolade ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setShowForm(true); setAssigningAccolade(null); }}
            >
              <Plus className="w-4 h-4 mr-2" />Add Accolade
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}