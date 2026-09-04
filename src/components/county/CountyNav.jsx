import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { Home, Users, Building2, Settings } from 'lucide-react';

export default function CountyNav() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');
  const location = useLocation();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: countyMembership } = useQuery({
    queryKey: ['myCountyMembership', countyId, user?.email],
    queryFn: async () => {
      const r = await base44.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email, status: 'approved' });
      return r[0];
    },
    enabled: !!countyId && !!user?.email,
  });

  const isPlatformAdmin = user?.role === 'admin';
  const canManage = isPlatformAdmin || countyMembership?.role === 'admin' || countyMembership?.role === 'secretary';

  const links = [
    { name: 'Home', page: 'CountyHome', icon: Home, show: true },
    { name: 'Members', page: 'CountyMembers', icon: Users, show: true },
    { name: 'Clubs', page: 'CountyAffiliations', icon: Building2, show: canManage },
    { name: 'Settings', page: 'CountyAdmin', icon: Settings, show: canManage },
  ].filter(l => l.show);

  const isActive = (page) => {
    const href = createPageUrl(page);
    return location.pathname === href;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide">
          {links.map(link => (
            <Link
              key={link.page}
              to={createPageUrl(link.page) + `?countyId=${countyId}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                isActive(link.page) ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}