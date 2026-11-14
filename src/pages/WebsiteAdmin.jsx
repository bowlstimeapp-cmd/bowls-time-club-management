import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Globe, ShieldAlert } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import WebsiteImportPanel from '@/components/website/WebsiteImportPanel';
import WebsiteListItem from '@/components/website/WebsiteListItem';

export default function WebsiteAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const rows = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return rows[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const rows = await base44.entities.Club.filter({ id: clubId });
      return rows[0];
    },
    enabled: !!clubId,
  });

  const { data: websites = [], isLoading: websitesLoading } = useQuery({
    queryKey: ['clubWebsites', clubId],
    queryFn: () => base44.entities.Website.filter({ club_id: clubId }, '-updated_date'),
    enabled: !!clubId,
  });

  if (!clubId) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <Globe className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h1 className="text-xl font-bold text-gray-900">Choose a club first</h1>
        <p className="text-sm text-gray-500 mt-1">The website module is per club.</p>
        <Link to={createPageUrl('ClubSelector')}>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">Go to club selector</Button>
        </Link>
      </div>
    );
  }

  const isPlatformAdmin = user?.role === 'admin';
  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  if (!user || membershipLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  if (!isPlatformAdmin && !isClubAdmin) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Access denied</h1>
        <p className="text-sm text-gray-600 mt-2">You need a club admin role to manage this club's website.</p>
        <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
          <Button className="mt-4" variant="outline">Back to the club</Button>
        </Link>
      </div>
    );
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clubWebsites', clubId] });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Club website</h1>
        <p className="text-sm text-gray-500 mt-1">
          {club?.name ? `${club.name} — ` : ''}import a designed site bundle, then edit it here.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Websites</h2>
        {websitesLoading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : websites.length === 0 ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-300" />
            No website yet — import a bundle below to create one.
          </div>
        ) : (
          <ul className="divide-y">
            {websites.map((website) => (
              <WebsiteListItem key={website.id} website={website} onPublished={refresh} />
            ))}
          </ul>
        )}
      </div>

      <WebsiteImportPanel clubId={clubId} websites={websites} onImported={refresh} />
    </div>
  );
}