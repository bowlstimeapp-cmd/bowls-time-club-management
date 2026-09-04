import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Users, CheckCircle, XCircle, Trash2, Search, ShieldAlert, Mail } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['admin', 'secretary', 'selector', 'member'];

export default function CountyMembers() {
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

  const refresh = () => qc.invalidateQueries({ queryKey: ['countyAffiliated', countyId] });
  const approve = useMutation({ mutationFn: id => base44.functions.invoke('approveCountyMembership', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Approved'); }, onError: e => toast.error(e?.message || 'Failed') });
  const reject = useMutation({ mutationFn: id => base44.functions.invoke('rejectCountyMembership', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Rejected'); }, onError: e => toast.error(e?.message || 'Failed') });
  const changeRole = useMutation({ mutationFn: ({id, newRole}) => base44.functions.invoke('changeCountyMemberRole', { membershipId: id, newRole }), onSuccess: () => { refresh(); toast.success('Role updated'); }, onError: e => toast.error(e?.message || 'Failed') });
  const removeMember = useMutation({ mutationFn: id => base44.functions.invoke('removeCountyMember', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Member removed'); }, onError: e => toast.error(e?.message || 'Failed') });

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;
  if (isLoading) return <><CountyNav /><div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div></>;

  const approved = affData?.approved || [];
  const pending = affData?.pending || [];
  const filtered = approved.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold">Affiliated Members</h1>
          <Badge variant="outline">{approved.length}</Badge>
        </div>

        {/* Pending requests */}
        {canManage && pending.length > 0 && (
          <Card>
            <div className="p-4 border-b font-semibold text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" /> Pending Join Requests ({pending.length})</div>
            <div className="divide-y">
              {pending.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3">
                  <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-gray-500">{m.email}</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve.mutate(m.id)} disabled={approve.isPending}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reject.mutate(m.id)} disabled={reject.isPending}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Approved members */}
        <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <Card>
          <div className="divide-y">
            {filtered.length === 0 ? <p className="p-6 text-center text-gray-400 text-sm">No members found.</p> : filtered.map(m => (
              <div key={m.email} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.source === 'direct' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Direct</Badge>}
                    {m.source === 'club' && <Badge className="bg-blue-100 text-blue-700 text-xs">Via Club</Badge>}
                    {m.source === 'both' && <Badge className="bg-purple-100 text-purple-700 text-xs">Direct + Club</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  {m.clubs.length > 0 && <p className="text-xs text-gray-400">Affiliated via: {m.clubs.map(c => c.clubName).join(', ')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.source !== 'club' && m.countyMembershipId ? (
                    <>
                      <Select value={m.role} onValueChange={newRole => changeRole.mutate({ id: m.countyMembershipId, newRole })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeMember.mutate(m.countyMembershipId)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        {canManage && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldAlert className="w-4 h-4" />
            Club-affiliated members (blue badge) are managed automatically — they leave when their club is unaffiliated or they leave the club.
          </div>
        )}
      </div>
    </>
  );
}