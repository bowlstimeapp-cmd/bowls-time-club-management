import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Loader2, Users, Link2, ShieldCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function CountiesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCounty, setEditingCounty] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', primary_admin_email: '', admin_first_name: '', admin_surname: '', is_active: true,
  });

  const { data: counties = [], isLoading } = useQuery({
    queryKey: ['allCounties'],
    queryFn: () => base44.entities.County.list('-created_date'),
  });
  const { data: allClubs = [] } = useQuery({
    queryKey: ['allActiveClubsForCountyEdit'],
    queryFn: () => base44.entities.Club.filter({ is_active: true }),
    enabled: dialogOpen && !!editingCounty,
  });
  const { data: countyAffiliations = [] } = useQuery({
    queryKey: ['countyEditAffiliations', editingCounty?.id],
    queryFn: () => base44.entities.ClubCountyAffiliation.filter({ county_id: editingCounty.id }),
    enabled: !!editingCounty?.id,
  });
  const addAffMutation = useMutation({
    mutationFn: clubId => base44.functions.invoke('manageCountyAffiliation', { action: 'add', countyId: editingCounty.id, clubId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['countyEditAffiliations', editingCounty.id] }); toast.success('Club affiliated'); setClubSearch(''); },
    onError: e => toast.error(e?.message || 'Failed'),
  });
  const removeAffMutation = useMutation({
    mutationFn: affiliationId => base44.functions.invoke('manageCountyAffiliation', { action: 'remove', countyId: editingCounty.id, affiliationId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['countyEditAffiliations', editingCounty.id] }); toast.success('Affiliation removed'); },
    onError: e => toast.error(e?.message || 'Failed'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createCounty', data);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data.county;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allCounties'] });
      toast.success('County created successfully');
      handleCloseDialog();
    },
    onError: (e) => toast.error(e?.message || 'Failed to create county'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.County.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allCounties'] });
      toast.success('County updated');
      handleCloseDialog();
    },
  });

  const handleOpenCreate = () => {
    setEditingCounty(null);
    setFormData({ name: '', description: '', primary_admin_email: '', admin_first_name: '', admin_surname: '', is_active: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (county) => {
    setEditingCounty(county);
    setFormData({
      name: county.name, description: county.description || '', primary_admin_email: county.primary_admin_email,
      admin_first_name: '', admin_surname: '', is_active: county.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditingCounty(null); setClubSearch(''); };
  const [clubSearch, setClubSearch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCounty) {
      updateMutation.mutate({ id: editingCounty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Counties</CardTitle>
          <Button size="sm" onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" />Add County
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : counties.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No counties yet. Create your first county!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {counties.map(county => (
              <div key={county.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">{county.name}</h3>
                      <Badge variant={county.is_active !== false ? 'default' : 'secondary'}>
                        {county.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{county.primary_admin_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(county)}>
                    <Pencil className="w-4 h-4 mr-1" />Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingCounty ? 'Edit County' : 'Create New County'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>County Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Hampshire County BA" required />
            </div>
            <div>
              <Label>Primary Admin Email *</Label>
              <Input type="email" value={formData.primary_admin_email} onChange={(e) => setFormData({ ...formData, primary_admin_email: e.target.value })} placeholder="admin@countyba.org" required />
              <p className="text-xs text-gray-500 mt-1">This user will be the founding county admin</p>
            </div>
            {!editingCounty && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Admin First Name</Label>
                  <Input value={formData.admin_first_name} onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })} placeholder="John" />
                </div>
                <div>
                  <Label>Admin Surname</Label>
                  <Input value={formData.admin_surname} onChange={(e) => setFormData({ ...formData, admin_surname: e.target.value })} placeholder="Smith" />
                </div>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the county…" rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              {formData.is_active ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, is_active: false })}>Active</Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, is_active: true })}>Inactive</Button>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCounty ? 'Save Changes' : 'Create County'}
              </Button>
            </DialogFooter>
          </form>
          {editingCounty && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Affiliated Clubs ({countyAffiliations.length})</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search clubs to add..." value={clubSearch} onChange={e => setClubSearch(e.target.value)} className="pl-9" />
              </div>
              {clubSearch && (
                <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                  {allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase()) && !countyAffiliations.some(a => a.club_id === c.id)).slice(0, 8).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2">
                      <span className="text-sm">{c.name}</span>
                      <Button size="sm" type="button" onClick={() => addAffMutation.mutate(c.id)} disabled={addAffMutation.isPending}>Add</Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {countyAffiliations.length === 0 ? <p className="text-xs text-gray-400">No affiliated clubs yet.</p> : countyAffiliations.map(a => {
                  const club = allClubs.find(c => c.id === a.club_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm">{club?.name || 'Unknown club'}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        <Button size="sm" type="button" variant="ghost" className="text-red-500" onClick={() => removeAffMutation.mutate(a.id)} disabled={removeAffMutation.isPending}>Remove</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}