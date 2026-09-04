import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronRight } from 'lucide-react';
import CountyLeagueDetail from './CountyLeagueDetail';

export default function CountyLeaguesSection({ countyId, canAdmin }) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', status: 'draft', is_sets: false, scoring_standard_win: true });

  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [compForm, setCompForm] = useState({ name: '', gender: 'mixed', age_group: 'n/a' });

  const { data: leagues = [], isLoading } = useQuery({ queryKey: ['countyLeagues', countyId], queryFn: () => base44.entities.CountyLeague.filter({ county_id: countyId }), enabled: !!countyId });
  const { data: teams = [] } = useQuery({ queryKey: ['countyTeamsForLeagues', countyId], queryFn: () => base44.entities.CountyTeam.filter({ county_id: countyId }), enabled: !!countyId });
  const { data: competitions = [] } = useQuery({ queryKey: ['countyCompetitions', countyId], queryFn: () => base44.entities.CountyCompetition.filter({ county_id: countyId }), enabled: !!countyId });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['countyLeagues', countyId] }); qc.invalidateQueries({ queryKey: ['countyCompetitions', countyId] }); };

  const saveLeague = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateCountyLeagueData', data),
    onSuccess: () => { refresh(); toast.success(editing ? 'League updated' : 'League created'); setDialogOpen(false); },
    onError: e => toast.error(e?.message || 'Failed'),
  });
  const deleteLeague = useMutation({
    mutationFn: (id) => base44.functions.invoke('updateCountyLeagueData', { entity: 'CountyLeague', action: 'delete', countyId, id }),
    onSuccess: () => { refresh(); toast.success('League deleted'); setExpandedId(null); },
    onError: e => toast.error(e?.message || 'Failed'),
  });
  const saveComp = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateCountyLeagueData', data),
    onSuccess: () => { refresh(); toast.success('Competition created'); setCompDialogOpen(false); setCompForm({ name: '', gender: 'mixed', age_group: 'n/a' }); },
    onError: e => toast.error(e?.message || 'Failed'),
  });
  const deleteComp = useMutation({
    mutationFn: (id) => base44.functions.invoke('updateCountyLeagueData', { entity: 'CountyCompetition', action: 'delete', countyId, id }),
    onSuccess: () => { refresh(); toast.success('Competition deleted'); },
    onError: e => toast.error(e?.message || 'Failed'),
  });

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', start_date: '', end_date: '', status: 'draft', is_sets: false, scoring_standard_win: true }); setDialogOpen(true); };
  const openEdit = (l) => { setEditing(l); setForm({ name: l.name, description: l.description || '', start_date: l.start_date || '', end_date: l.end_date || '', status: l.status, is_sets: l.is_sets, scoring_standard_win: l.scoring_standard_win !== false }); setDialogOpen(true); };

  const submitLeague = () => {
    if (!form.name.trim()) return toast.error('Name required');
    const data = { name: form.name.trim(), description: form.description, start_date: form.start_date || undefined, end_date: form.end_date || undefined, status: form.status, is_sets: form.is_sets, scoring_standard_win: form.scoring_standard_win };
    if (editing) saveLeague.mutate({ entity: 'CountyLeague', action: 'update', countyId, id: editing.id, data });
    else saveLeague.mutate({ entity: 'CountyLeague', action: 'create', countyId, data });
  };

  return (
    <>
      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" />Leagues ({leagues.length})</CardTitle>{canAdmin && <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New League</Button>}</div></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : leagues.length === 0 ? <p className="text-sm text-slate-400">No leagues yet. Create one to add teams and fixtures.</p> : leagues.map(l => (
            <div key={l.id} className="border rounded-xl bg-white">
              <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                <div className="flex items-center gap-2">
                  {expandedId === l.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div><p className="font-medium">{l.name}</p><p className="text-xs text-slate-500">{(l.team_ids || []).length} teams · {l.is_sets ? 'Sets' : 'Standard'} scoring</p></div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Badge variant="outline">{l.status}</Badge>
                  {canAdmin && <><Button size="sm" variant="ghost" onClick={() => openEdit(l)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteLeague.mutate(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button></>}
                </div>
              </div>
              {expandedId === l.id && <div className="p-3 pt-0 border-t"><CountyLeagueDetail countyId={countyId} league={l} teams={teams} canAdmin={canAdmin} onBack={() => setExpandedId(null)} /></div>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Competitions ({competitions.length})</CardTitle>{canAdmin && <Button size="sm" onClick={() => setCompDialogOpen(true)}><Plus className="w-4 h-4 mr-1" />New</Button>}</div></CardHeader>
        <CardContent className="space-y-2">
          {competitions.length === 0 ? <p className="text-sm text-slate-400">No competitions yet.</p> : competitions.map(c => (
            <div key={c.id} className="flex items-center justify-between border rounded-lg p-2 bg-white">
              <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-slate-500">{c.gender} · {c.age_group} · {(c.team_ids || []).length} teams</p></div>
              {canAdmin && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteComp.mutate(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* League dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit League' : 'Create League'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1" /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
            <div className="flex items-center justify-between"><div><Label>Sets scoring</Label><p className="text-xs text-slate-500">Enable for sets-based leagues</p></div><Switch checked={form.is_sets} onCheckedChange={v => setForm(f => ({ ...f, is_sets: v }))} /></div>
            {form.is_sets && <div className="flex items-center justify-between"><div><Label>Standard win points</Label><p className="text-xs text-slate-500">2pts win, 1pt draw</p></div><Switch checked={form.scoring_standard_win} onCheckedChange={v => setForm(f => ({ ...f, scoring_standard_win: v }))} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={submitLeague} disabled={saveLeague.isPending}>{editing ? 'Save' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Competition dialog */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Competition</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Gender</Label><Select value={compForm.gender} onValueChange={v => setCompForm(f => ({ ...f, gender: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="men">Men</SelectItem><SelectItem value="women">Women</SelectItem></SelectContent></Select></div>
            <div><Label>Age Group</Label><Select value={compForm.age_group} onValueChange={v => setCompForm(f => ({ ...f, age_group: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="n/a">N/A</SelectItem><SelectItem value="u25">U25</SelectItem><SelectItem value="o60">O60</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCompDialogOpen(false)}>Cancel</Button><Button onClick={() => { if (!compForm.name.trim()) return toast.error('Name required'); saveComp.mutate({ entity: 'CountyCompetition', action: 'create', countyId, data: compForm }); }} disabled={saveComp.isPending}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}