import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  CalendarCheck, 
  ShieldCheck, 
  User, 
  LogOut,
  Menu,
  X,
  Building2,
  Users,
  Settings,
  Trophy,
  Table2,
  ClipboardList,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationDropdown from '@/components/NotificationDropdown';
import LiveMatchBanner from '@/components/LiveMatchBanner';
import FloatingFeedbackButton from '@/components/FloatingFeedbackButton';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const isSelector = (membership?.role === 'selector' || membership?.role === 'admin') && membership?.status === 'approved';
  const isPlatformAdmin = user?.role === 'admin';

  // Pages that don't need club context
  const noClubPages = ['ClubSelector', 'PlatformAdmin'];
  const needsClub = !noClubPages.includes(currentPageName);

  const clubNavigation = [
    ...(club?.module_homepage ? [
      { name: 'Club Home', href: createPageUrl('ClubHome') + `?clubId=${clubId}`, icon: Building2 },
    ] : []),
    ...(club?.module_rink_booking !== false ? [
      { name: 'Book a Rink', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar },
      { name: 'My Bookings', href: createPageUrl('MyBookings') + `?clubId=${clubId}`, icon: CalendarCheck },
    ] : []),
    ...(club?.module_selection !== false ? [
      { name: 'Selection', href: createPageUrl('Selection') + `?clubId=${clubId}`, icon: ClipboardList },
    ] : []),
    ...(club?.module_competitions !== false ? [
      { name: 'Competitions', href: createPageUrl('ClubTournaments') + `?clubId=${clubId}`, icon: Trophy },
    ] : []),
    ...(club?.module_leagues !== false ? [
      { name: 'Leagues', href: createPageUrl(isClubAdmin ? 'LeagueAdmin' : 'LeagueView') + `?clubId=${clubId}`, icon: Table2 },
      { name: 'My Teams', href: createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`, icon: Users },
    ] : []),
  ];

  const isActive = (href) => {
    const [path] = href.split('?');
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Live Match Banner */}
      <LiveMatchBanner clubId={clubId} />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('ClubSelector')} className="flex items-center gap-3 shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png"
                alt="BowlsTime"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="hidden sm:block">
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  {club?.name || 'BowlsTime'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {needsClub && clubId && (
              <nav className="hidden md:flex items-center gap-2">
                {/* Club Home */}
                {club?.module_homepage && (
                  <Link
                    to={createPageUrl('ClubHome') + `?clubId=${clubId}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(createPageUrl('ClubHome'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Building2 className="w-4 h-4" />
                    Home
                  </Link>
                )}
                {/* Rink Booking Dropdown */}
                {club?.module_rink_booking !== false && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <Calendar className="w-4 h-4" />
                        Rink Booking
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Calendar className="w-4 h-4 mr-2" />
                          Book a Rink
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('MyBookings') + `?clubId=${clubId}`} className="cursor-pointer">
                          <CalendarCheck className="w-4 h-4 mr-2" />
                          My Bookings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Selection */}
                {club?.module_selection !== false && (
                  <Link
                    to={createPageUrl('Selection') + `?clubId=${clubId}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(createPageUrl('Selection'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Selection
                  </Link>
                )}

                {/* Competitions */}
                {club?.module_competitions !== false && (
                  <Link
                    to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(createPageUrl('ClubTournaments'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Trophy className="w-4 h-4" />
                    Competitions
                  </Link>
                )}

                {/* My Teams (for all members if leagues enabled) */}
                {club?.module_leagues !== false && (
                  <Link
                    to={createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(createPageUrl('MyLeagueTeam'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    My Teams
                  </Link>
                )}

                {/* Admin Dropdown (only for admins) */}
                {isClubAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <ShieldCheck className="w-4 h-4" />
                        Admin
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {club?.module_leagues !== false && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('LeagueAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Table2 className="w-4 h-4 mr-2" />
                            Leagues
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AdminBookings') + `?clubId=${clubId}`} className="cursor-pointer">
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Bookings Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('RinkDisplayTV') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Calendar className="w-4 h-4 mr-2" />
                          TV Display
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('ClubAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Users className="w-4 h-4 mr-2" />
                          Members
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('OpenCompetitions') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Trophy className="w-4 h-4 mr-2" />
                          Open Competitions
                        </Link>
                      </DropdownMenuItem>
                      {club?.module_function_rooms && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('FunctionRoomAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Building2 className="w-4 h-4 mr-2" />
                            Function Rooms
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
            {needsClub && clubId && (
              <Link 
                to={createPageUrl('ClubSelector') + '?switchClubs=true'}
                className="hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <Building2 className="w-4 h-4" />
                Switch Club
              </Link>
            )}

            {user?.email && <NotificationDropdown userEmail={user.email} />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  {club?.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded-full object-contain bg-white border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-700" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.first_name && user?.surname 
                      ? `${user.first_name} ${user.surname}` 
                      : (user?.full_name || user?.email?.split('@')[0])}
                  </span>
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile') + (clubId ? `?clubId=${clubId}` : '')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Feedback')} className="cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Feedback
                    </Link>
                  </DropdownMenuItem>
                  {isClubAdmin && clubId && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('ClubSettings') + `?clubId=${clubId}`} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Club Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isPlatformAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('PlatformAdmin')} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Platform Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => base44.auth.logout()}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              {needsClub && clubId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && needsClub && clubId && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {clubNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                    isActive(item.href)
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              {isClubAdmin && (
                <>
                  <Link
                    to={createPageUrl('AdminBookings') + `?clubId=${clubId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                      isActive(createPageUrl('AdminBookings'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Bookings Admin
                  </Link>
                  <Link
                    to={createPageUrl('ClubAdmin') + `?clubId=${clubId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                      isActive(createPageUrl('ClubAdmin'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Users className="w-5 h-5" />
                    Members
                  </Link>
                  <Link
                    to={createPageUrl('OpenCompetitions') + `?clubId=${clubId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                      isActive(createPageUrl('OpenCompetitions'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Trophy className="w-5 h-5" />
                    Open Competitions
                  </Link>
                  {club?.module_function_rooms && (
                    <Link
                      to={createPageUrl('FunctionRoomAdmin') + `?clubId=${clubId}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                        isActive(createPageUrl('FunctionRoomAdmin'))
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Building2 className="w-5 h-5" />
                      Function Rooms
                    </Link>
                  )}
                </>
              )}
              <Link
                to={createPageUrl('ClubSelector') + '?switchClubs=true'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <Building2 className="w-5 h-5" />
                Switch Club
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-0 pb-safe">{children}</main>
      
      {/* Floating Feedback Button */}
      <FloatingFeedbackButton />
    </div>
  );
}