import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Building2, Search, Plus, CheckCircle, XCircle, Trash2, ShieldAlert, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function CountyAffiliations() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: countyMembership } = useQuery({
    queryKey: ['myCountyMembership', countyId, user?.email],
    queryFn: async () => { const r = await base44.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email, status: 'approved' }); return r[0]; },
    enabled: !!countyId && !!user?.email,
  });
  const isPlatformAdmin = user?.role === 'admin';
  const canManage = isPlatformAdmin || countyMembership?.role === 'admin' || countyMembership?.role === 'secretary';

  const { data: affData, isLoading } = useQuery({
    queryKey: ['countyAffiliated', countyId],
    queryFn: async () => { const res = await base44.functions.invoke('getCountyAffiliatedMembers', { countyId }); return res.data; },
    enabled: !!countyId,
  });
  const { data: allClubs = [] } = useQuery({
    queryKey: ['allActiveClubsForCountyAff'],
    queryFn: () => base44.entities.Club.filter({ is_active: true }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['countyAffiliated', countyId] });
  const addAff = useMutation({ mutationFn: clubId => base44.functions.invoke('manageCountyAffiliation', { action: 'add', countyId, clubId }), onSuccess: () => { refresh(); setSearch(''); toast.success('Club affiliated'); }, onError: e => toast.error(e?.message || 'Failed') });
  const removeAff = useMutation({ mutationFn: affiliationId => base44.functions.invoke('manageCountyAffiliation', { action: 'remove', countyId, affiliationId }), onSuccess: () => { refresh(); toast.success('Affiliation removed'); }, onError: e => toast.error(e?.message || 'Failed') });
  const approveAff = useMutation({ mutationFn: id => base44.functions.invoke('approveClubAffiliation', { affiliationId: id }), onSuccess: () => { refresh(); toast.success('Approved'); }, onError: e => toast.error(e?.message || 'Failed') });
  const rejectAff = useMutation({ mutationFn: id => base44.functions.invoke('rejectClubAffiliation', { affiliationId: id }), onSuccess: () => { refresh(); toast.success('Rejected'); }, onError: e => toast.error(e?.message || 'Failed') });

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;
  if (!canManage) return <><CountyNav /><div className="max-w-4xl mx-auto p-8"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 w-10 h-10 text-red-500" /><p className="font-semibold">Access denied</p><p className="text-sm text-gray-500 mt-1">Only county admins and secretaries can manage affiliations.</p></CardContent></Card></div></>;
  if (isLoading) return <><CountyNav /><div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div></>;

  const affiliatedClubIds = new Set((affData?.affiliatedClubs || []).concat(affData?.pendingAffiliations || []).map(a => a.clubId));
  const searchResults = search.trim() ? allClubs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && !affiliatedClubIds.has(c.id)).slice(0, 8) : [];
  const pendingAff = affData?.pendingAffiliations || [];
  const approvedAff = affData?.affiliatedClubs || [];

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold">Manage Club Affiliations</h1>
        </div>

        {/* Add clubs */}
        <Card>
          <div className="p-4 border-b font-semibold text-sm">Add Club</div>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search active clubs by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y">
                {searchResults.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 hover:bg-gray-50">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Button size="sm" onClick={() => addAff.mutate(c.id)} disabled={addAff.isPending}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending requests */}
        {pendingAff.length > 0 && (
          <Card>
            <div className="p-4 border-b font-semibold text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" /> Pending Requests ({pendingAff.length})</div>
            <div className="divide-y">
              {pendingAff.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3">
                  <div><p className="font-medium text-sm">{a.clubName}</p><p className="text-xs text-gray-500">Requested by: {a.requestedBy}</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveAff.mutate(a.id)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => rejectAff.mutate(a.id)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Approved affiliations */}
        <Card>
          <div className="p-4 border-b font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-green-600" /> Affiliated Clubs ({approvedAff.length})</div>
          <div className="divide-y">
            {approvedAff.length === 0 ? <p className="p-4 text-center text-gray-400 text-sm">No affiliated clubs yet.</p> : approvedAff.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm">{a.clubName}</span>
                  <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">Approved</Badge>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeAff.mutate(a.id)}><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}