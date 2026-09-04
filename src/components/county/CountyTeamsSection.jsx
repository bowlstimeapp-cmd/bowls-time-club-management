import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function CountyTeamsSection({ countyId, canAdmin }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState({ name: '', team_type: 'representative', club_id: '' });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['countyTeams', countyId],
    queryFn: () => base44.entities.CountyTeam.filter({ county_id: countyId }),
    enabled: !!countyId,
  });
  const { data: affiliatedClubs = [] } = useQuery({
    queryKey: ['affiliatedClubsForTeams', countyId],
    queryFn: async () => {
      const affs = await base44.entities.ClubCountyAffiliation.filter({ county_id: countyId, status: 'approved' });
      if (!affs.length) return [];
      const clubs = await base44.entities.Club.filter({ id: { $in: affs.map(a => a.club_id) } });
      return clubs;
    },
    enabled: !!countyId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['countyTeams', countyId] });

  const create = useMutation({
    mutationFn: (data) => base44.functions.invoke('createCountyTeam', data),
    onSuccess: () => { refresh(); toast.success('Team created'); setDialogOpen(false); },
    onError: e => toast.error(e?.message || 'Failed to create team'),
  });
  const update = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateCountyTeam', data),
    onSuccess: () => { refresh(); toast.success('Team updated'); setDialogOpen(false); },
    onError: e => toast.error(e?.message || 'Failed to update team'),
  });
  const remove = useMutation({
    mutationFn: (teamId) => base44.functions.invoke('deleteCountyTeam', { teamId }),
    onSuccess: () => { refresh(); toast.success('Team deleted'); },
    onError: e => toast.error(e?.message || 'Failed to delete team'),
  });

  const clubName = (id) => affiliatedClubs.find(c => c.id === id)?.name || 'Unknown club';

  const openCreate = () => { setEditingTeam(null); setForm({ name: '', team_type: 'representative', club_id: '' }); setDialogOpen(true); };
  const openEdit = (t) => { setEditingTeam(t); setForm({ name: t.name, team_type: t.team_type, club_id: t.club_id || '' }); setDialogOpen(true); };

  const submit = () => {
    if (!form.name.trim()) return toast.error('Team name is required');
    if (form.team_type === 'club' && !form.club_id) return toast.error('Select an affiliated club for club-type teams');
    if (editingTeam) {
      update.mutate({ teamId: editingTeam.id, name: form.name.trim(), teamType: form.team_type, clubId: form.team_type === 'club' ? form.club_id : undefined });
    } else {
      create.mutate({ countyId, name: form.name.trim(), teamType: form.team_type, clubId: form.team_type === 'club' ? form.club_id : undefined });
    }
  };

  const representativeTeams = teams.filter(t => t.team_type === 'representative');
  const clubTeams = teams.filter(t => t.team_type === 'club');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Teams ({teams.length})</CardTitle>
            {canAdmin && <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add Team</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? <p className="text-sm text-slate-400">Loading teams...</p> : teams.length === 0 ? <p className="text-sm text-slate-400">No teams yet. Create representative teams (selected from county members) or club teams (report a roster from an affiliated club).</p> : (
            <>
              {representativeTeams.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Representative Teams</p>
                  <div className="space-y-2">
                    {representativeTeams.map(t => (
                      <div key={t.id} className="flex items-center justify-between border rounded-xl p-3 bg-white">
                        <div><p className="font-medium">{t.name}</p><p className="text-sm text-slate-500">Selected from county membership</p></div>
                        {canAdmin && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(t.id)}><Trash2 className="w-4 h-4" /></Button></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {clubTeams.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Club Teams</p>
                  <div className="space-y-2">
                    {clubTeams.map(t => (
                      <div key={t.id} className="flex items-center justify-between border rounded-xl p-3 bg-white">
                        <div><p className="font-medium">{t.name}</p><p className="text-sm text-slate-500">{clubName(t.club_id)} · reports roster from club membership</p></div>
                        {canAdmin && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(t.id)}><Trash2 className="w-4 h-4" /></Button></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Team Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. County A Team" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Team Type</label>
              <Select value={form.team_type} onValueChange={v => setForm(f => ({ ...f, team_type: v, club_id: v === 'club' ? f.club_id : '' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="representative">Representative — selected from county members</SelectItem>
                  <SelectItem value="club">Club — reports roster from an affiliated club</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.team_type === 'club' && (
              <div>
                <label className="text-sm font-medium">Affiliated Club</label>
                <Select value={form.club_id} onValueChange={v => setForm(f => ({ ...f, club_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={affiliatedClubs.length ? 'Select a club' : 'No affiliated clubs'} /></SelectTrigger>
                  <SelectContent>
                    {affiliatedClubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {affiliatedClubs.length === 0 && <p className="text-xs text-amber-600 mt-1">No approved club affiliations yet — approve an affiliation first.</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>{editingTeam ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}