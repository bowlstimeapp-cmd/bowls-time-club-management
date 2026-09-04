import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import CountyTeamsSection from '@/components/county/CountyTeamsSection';
import CountyLeaguesSection from '@/components/county/CountyLeaguesSection';

export default function CountyAdmin() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: county } = useQuery({ queryKey: ['county', countyId], queryFn: async () => (await base44.entities.County.filter({ id: countyId }))[0], enabled: !!countyId });
  const { data: countyMembership } = useQuery({
    queryKey: ['myCountyMembership', countyId, user?.email],
    queryFn: async () => { const r = await base44.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email, status: 'approved' }); return r[0]; },
    enabled: !!countyId && !!user?.email,
  });

  const isPlatformAdmin = user?.role === 'admin';
  const canManage = isPlatformAdmin || countyMembership?.role === 'admin' || countyMembership?.role === 'secretary';

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;
  if (!user || !county) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!canManage) return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-8"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 w-10 h-10 text-red-500" /><p className="font-semibold">Access denied</p><p className="text-sm text-gray-500 mt-1">Only county admins and secretaries can access settings.</p></CardContent></Card></div>
    </>
  );

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <h1 className="text-2xl font-bold">{county.name} — Settings</h1>
        <CountyTeamsSection countyId={countyId} canAdmin={canManage} />
        <CountyLeaguesSection countyId={countyId} canAdmin={canManage} />
      </div>
    </>
  );
}