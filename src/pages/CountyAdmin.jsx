import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, CheckCircle, XCircle, Trash2, ShieldAlert, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['admin', 'secretary', 'selector', 'member'];

export default function CountyAdmin() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');
  const qc = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: county } = useQuery({ queryKey: ['county', countyId], queryFn: async () => (await base44.entities.County.filter({ id: countyId }))[0], enabled: !!countyId });
  const { data: memberships = [], isLoading } = useQuery({ queryKey: ['countyMemberships', countyId], queryFn: () => base44.entities.CountyMembership.filter({ county_id: countyId }), enabled: !!countyId });
  const { data: affiliations = [] } = useQuery({ queryKey: ['countyAffiliations', countyId], queryFn: () => base44.entities.ClubCountyAffiliation.filter({ county_id: countyId }), enabled: !!countyId });
  const { data: allClubs = [] } = useQuery({ queryKey: ['allActiveClubsForCounty', countyId], queryFn: () => base44.entities.Club.filter({ is_active: true }), enabled: !!countyId });

  const myMembership = memberships.find(m => m.user_email === user?.email && m.status === 'approved');
  const canAdmin = user?.role === 'admin' || myMembership?.role === 'admin';
  const canSecretary = canAdmin || myMembership?.role === 'secretary';
  const refresh = () => { qc.invalidateQueries({ queryKey: ['countyMemberships', countyId] }); qc.invalidateQueries({ queryKey: ['countyAffiliations', countyId] }); };

  const approve = useMutation({ mutationFn: id => base44.functions.invoke('approveCountyMembership', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Membership approved'); }, onError: e => toast.error(e?.message || 'Approval failed') });
  const reject = useMutation({ mutationFn: id => base44.functions.invoke('rejectCountyMembership', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Membership rejected'); }, onError: e => toast.error(e?.message || 'Rejection failed') });
  const role = useMutation({ mutationFn: ({id,newRole}) => base44.functions.invoke('changeCountyMemberRole', { membershipId: id, newRole }), onSuccess: () => { refresh(); toast.success('Role updated'); }, onError: e => toast.error(e?.message || 'Role update failed') });
  const remove = useMutation({ mutationFn: id => base44.functions.invoke('removeCountyMember', { membershipId: id }), onSuccess: () => { refresh(); toast.success('Member removed'); }, onError: e => toast.error(e?.message || 'Removal failed') });

  const approveAffiliation = useMutation({ mutationFn: id => base44.functions.invoke('approveClubAffiliation', { affiliationId: id }), onSuccess: () => { refresh(); toast.success('Club affiliation approved'); }, onError: e => toast.error(e?.message || 'Approval failed') });
  const rejectAffiliation = useMutation({ mutationFn: id => base44.functions.invoke('rejectClubAffiliation', { affiliationId: id }), onSuccess: () => { refresh(); toast.success('Club affiliation rejected'); }, onError: e => toast.error(e?.message || 'Rejection failed') });
  const removeAffiliation = useMutation({ mutationFn: id => base44.functions.invoke('removeClubAffiliation', { affiliationId: id }), onSuccess: () => { refresh(); toast.success('Affiliation removed'); }, onError: e => toast.error(e?.message || 'Removal failed') });

  if (!countyId) return <div className="p-8">No county selected.</div>;
  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!canSecretary) return <div className="min-h-screen flex items-center justify-center"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 w-10 h-10 text-red-500" /><p className="font-semibold">Access denied</p></CardContent></Card></div>;

  const pending = memberships.filter(m => m.status === 'pending');
  const approved = memberships.filter(m => m.status === 'approved');
  const clubName = (id) => allClubs.find(c => c.id === id)?.name || 'Unknown club';
  const pendingAffiliations = affiliations.filter(a => a.status === 'pending');
  const approvedAffiliations = affiliations.filter(a => a.status === 'approved');

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-3xl font-bold text-slate-900">{county?.name || 'County'} Admin</h1><p className="text-slate-500 mt-1">{county?.description || 'Manage county membership'}</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Pending requests <Badge>{pending.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">
      {pending.length === 0 ? <p className="text-sm text-slate-400">No pending requests.</p> : pending.map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3 bg-white"><div><p className="font-medium">{m.user_name || m.user_email}</p><p className="text-sm text-slate-500">{m.user_email}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => approve.mutate(m.id)} disabled={!canSecretary}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button><Button size="sm" variant="outline" onClick={() => reject.mutate(m.id)} disabled={!canSecretary}><XCircle className="w-4 h-4 mr-1" />Reject</Button></div></div>)}
    </CardContent></Card>
    {pendingAffiliations.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Pending Club Affiliations <Badge>{pendingAffiliations.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">
      {pendingAffiliations.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3 bg-white"><div><p className="font-medium">{clubName(a.club_id)}</p><p className="text-sm text-slate-500">Requested by: {a.requested_by}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => approveAffiliation.mutate(a.id)} disabled={!canSecretary}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button><Button size="sm" variant="outline" onClick={() => rejectAffiliation.mutate(a.id)} disabled={!canSecretary}><XCircle className="w-4 h-4 mr-1" />Reject</Button></div></div>)}
    </CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Affiliated Clubs ({approvedAffiliations.length})</CardTitle></CardHeader><CardContent className="space-y-3">
      {approvedAffiliations.length === 0 ? <p className="text-sm text-slate-400">No affiliated clubs yet.</p> : approvedAffiliations.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3 bg-white"><div><p className="font-medium">{clubName(a.club_id)}</p><p className="text-sm text-slate-500">{allClubs.find(c => c.id === a.club_id)?.primary_admin_email || ''}</p></div>{canAdmin && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeAffiliation.mutate(a.id)}><Trash2 className="w-4 h-4 mr-1" />Remove</Button>}</div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Members ({approved.length})</CardTitle></CardHeader><CardContent className="space-y-3">
      {approved.map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3 bg-white"><div><p className="font-medium">{m.user_name || m.user_email}</p><p className="text-sm text-slate-500">{m.user_email}</p></div><div className="flex items-center gap-2">{canAdmin ? <Select value={m.role} onValueChange={newRole => role.mutate({id:m.id,newRole})}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline">{m.role}</Badge>}{canAdmin && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(m.id)}><Trash2 className="w-4 h-4" /></Button>}</div></div>)}
    </CardContent></Card>
  </div></div>;
}