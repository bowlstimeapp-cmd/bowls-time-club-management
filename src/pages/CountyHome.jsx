import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, MapPin, Loader2, ShieldAlert } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function CountyHome() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: county, isLoading: countyLoading } = useQuery({
    queryKey: ['county', countyId],
    queryFn: async () => { const r = await base44.entities.County.filter({ id: countyId }); return r[0]; },
    enabled: !!countyId,
  });
  const { data: affData, isLoading: affLoading } = useQuery({
    queryKey: ['countyAffiliated', countyId],
    queryFn: () => base44.functions.invoke('getCountyAffiliatedMembers', { countyId }),
    enabled: !!countyId,
  });

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;
  if (countyLoading || affLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!county) return <div className="p-8 text-center text-gray-500">County not found.</div>;

  const myEntry = affData?.approved?.find(m => m.email === user?.email);
  const isPlatformAdmin = user?.role === 'admin';
  const hasAccess = isPlatformAdmin || myEntry;
  if (!hasAccess) {
    return (
      <>
        <CountyNav />
        <div className="max-w-4xl mx-auto p-8"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 w-10 h-10 text-red-500" /><p className="font-semibold">You don't have access to this county.</p><p className="text-sm text-gray-500 mt-1">Ask your club to affiliate or request to join the county directly.</p></CardContent></Card></div>
      </>
    );
  }

  const myConnection = () => {
    if (isPlatformAdmin) return { label: 'Platform Admin', badge: 'bg-purple-100 text-purple-700' };
    if (myEntry?.source === 'direct') return { label: myEntry.role === 'admin' ? 'County Admin' : myEntry.role === 'secretary' ? 'Secretary' : myEntry.role === 'selector' ? 'Selector' : 'Member', badge: 'bg-emerald-100 text-emerald-700' };
    if (myEntry?.source === 'club') return { label: 'Affiliated via ' + (myEntry.clubs[0]?.clubName || 'club'), badge: 'bg-blue-100 text-blue-700' };
    if (myEntry?.source === 'both') return { label: 'Member + via ' + (myEntry.clubs[0]?.clubName || 'club'), badge: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Member', badge: 'bg-gray-100 text-gray-700' };
  };

  const conn = myConnection();

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{county.name}</h1>
            {county.description && <p className="text-gray-500 mt-1">{county.description}</p>}
            <Badge className={`mt-2 ${conn.badge}`}>{conn.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-5 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{affData?.totalMembers || 0}</p>
            <p className="text-sm text-gray-500">Affiliated Members</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{affData?.affiliatedClubs?.length || 0}</p>
            <p className="text-sm text-gray-500">Affiliated Clubs</p>
          </CardContent></Card>
        </div>

        {affData?.affiliatedClubs?.length > 0 && (
          <Card>
            <div className="p-5 border-b"><h3 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-600" /> Affiliated Clubs</h3></div>
            <div className="divide-y">
              {affData.affiliatedClubs.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-500" /></div>
                  <span className="font-medium text-sm flex-1">{c.clubName}</span>
                  <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">Approved</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Link to={createPageUrl('CountyMembers') + `?countyId=${countyId}`} className="flex-1">
            <Card className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4 text-center"><Users className="w-5 h-5 mx-auto mb-1 text-purple-600" /><p className="text-sm font-medium">View Members</p></CardContent></Card>
          </Link>
        </div>
      </div>
    </>
  );
}