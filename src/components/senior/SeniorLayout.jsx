/**
 * Senior Experience Mode Layout
 * Wraps every senior page with large, simple navigation.
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { useSeniorMode } from '@/lib/SeniorModeContext';
import {
  Home, Calendar, ClipboardList, Trophy, Users, MessageSquare,
  HelpCircle, Settings, Menu, X, ChevronRight, LogOut
} from 'lucide-react';

const NAV_ITEMS = (clubId) => [
  { label: 'Home',         icon: Home,          path: 'SeniorHome',    href: `/SeniorHome?clubId=${clubId}` },
  { label: 'Book a Rink',  icon: Calendar,      path: 'SeniorBookRink',href: `/SeniorBookRink?clubId=${clubId}` },
  { label: 'Fixtures',     icon: ClipboardList, path: 'SeniorFixtures', href: `/SeniorFixtures?clubId=${clubId}` },
  { label: 'Competitions', icon: Trophy,        path: 'SeniorCompetitions', href: `/SeniorCompetitions?clubId=${clubId}` },
  { label: 'Members',      icon: Users,         path: 'SeniorMembers', href: `/SeniorMembers?clubId=${clubId}` },
  { label: 'Messages',     icon: MessageSquare, path: 'ClubMessaging', href: `/ClubMessaging?clubId=${clubId}` },
  { label: 'Settings',     icon: Settings,      path: 'Profile',       href: `/Profile?clubId=${clubId}` },
];

export default function SeniorLayout({ children }) {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const location = useLocation();
  const { setSeniorMode } = useSeniorMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const navItems = NAV_ITEMS(clubId || '');
  const isActive = (href) => location.pathname === href.split('?')[0];

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#1F5E3B] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {club?.logo_url && (
              <img src={club.logo_url} alt={club.name} className="w-10 h-10 rounded-full object-contain bg-white" />
            )}
            <div>
              <p className="text-xs text-emerald-200 font-medium uppercase tracking-wide">BowlsTime</p>
              <p className="text-lg font-bold leading-tight">{club?.name || 'My Club'}</p>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Open menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Slide-down nav menu */}
      {menuOpen && (
        <div className="bg-[#1F5E3B] text-white z-40 shadow-xl">
          <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 p-4 rounded-xl font-bold text-base transition-colors min-h-[64px] ${
                    active ? 'bg-white text-emerald-800' : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            {/* Exit senior mode */}
            <button
              onClick={() => {
                setSeniorMode(false);
                window.location.href = createPageUrl('BookRink') + (clubId ? `?clubId=${clubId}` : '');
              }}
              className="flex items-center gap-3 p-4 rounded-xl font-bold text-base bg-amber-600 hover:bg-amber-500 text-white min-h-[64px] transition-colors"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              Standard View
            </button>
          </div>
        </div>
      )}

      {/* Page title bar */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Bottom tab nav — visible even without menu open */}
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide">
            {navItems.slice(0, 5).map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[56px] min-w-[64px] transition-colors ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {user && (
            <p className="text-sm text-gray-600 font-medium shrink-0 hidden sm:block">
              Hello, {user.first_name || user.full_name?.split(' ')[0] || 'there'}
            </p>
          )}
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">BowlsTime &bull; {club?.name}</p>
          <Link
            to={createPageUrl('SeniorHome') + (clubId ? `?clubId=${clubId}` : '')}
            className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 min-h-[44px] px-3 py-2 rounded-lg bg-emerald-50"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </footer>
    </div>
  );
}