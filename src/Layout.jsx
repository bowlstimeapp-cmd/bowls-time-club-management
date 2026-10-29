import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Calendar, 
  CalendarCheck, 
  CalendarDays, 
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
  MessageSquare,
  ListChecks,
  Download,
  MessagesSquare,
  BookOpen,
  Target,
  LayoutDashboard,
  LifeBuoy,
  Award,
  Receipt,
  Rocket,
  Star,
  MoreHorizontal,
  ChevronUp,
  Coffee
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { usePlatformSetting } from '@/hooks/usePlatformSetting';
import { cn } from '@/lib/utils';
import NotificationDropdown from '@/components/NotificationDropdown';
import LiveMatchBanner from '@/components/LiveMatchBanner';
import FloatingFeedbackButton from '@/components/FloatingFeedbackButton';
import PageHelpPopup from '@/components/help/PageHelpPopup';
import { useKiosk } from '@/lib/KioskContext';
import ModuleLockedNotice from '@/components/club/ModuleLockedNotice';
import { ONBOARDING_ITEMS } from '@/lib/onboardingChecklist';
import LegalFooterLinks from '@/components/legal/LegalFooterLinks';

const MODULE_PAGE_MAP = {
  BookRink: { key: 'module_rink_booking', name: 'Rink Booking', desc: 'Book rinks, manage sessions, and track availability across your club facilities.' },
  Selection: { key: 'module_selection', name: 'Match Selection', desc: 'Create and publish team selections with availability tracking and automatic notifications.' },
  SelectionEditor: { key: 'module_selection', name: 'Match Selection', desc: 'Create and publish team selections with availability tracking and automatic notifications.' },
  SelectionView: { key: 'module_selection', name: 'Match Selection', desc: 'Create and publish team selections with availability tracking and automatic notifications.' },
  ClubTournaments: { key: 'module_competitions', name: 'Competitions', desc: 'Run knockout and round-robin tournaments with automatic bracket generation and draw downloads.' },
  TournamentEditor: { key: 'module_competitions', name: 'Competitions', desc: 'Run knockout and round-robin tournaments with automatic bracket generation and draw downloads.' },
  TournamentView: { key: 'module_competitions', name: 'Competitions', desc: 'Run knockout and round-robin tournaments with automatic bracket generation and draw downloads.' },
  OpenCompetitions: { key: 'module_competitions', name: 'Competitions', desc: 'Run knockout and round-robin tournaments with automatic bracket generation and draw downloads.' },
  CompetitionRegistration: { key: 'module_competitions', name: 'Competitions', desc: 'Run knockout and round-robin tournaments with automatic bracket generation and draw downloads.' },
  LeagueAdmin: { key: 'module_leagues', name: 'Leagues', desc: 'Run full round-robin leagues with automatic fixtures, standings, and printable tables.' },
  LeagueView: { key: 'module_leagues', name: 'Leagues', desc: 'Run full round-robin leagues with automatic fixtures, standings, and printable tables.' },
  ClubFixtures: { key: 'module_leagues', name: 'Fixtures', desc: 'Manage club fixtures with automatic rink booking and draft selection creation.' },
  CompetitionAvailability: { key: 'module_selection', name: 'Competition Availability', desc: 'Indicate which competitions you want to be considered for.' },
  ClubHome: { key: 'module_homepage', name: 'Club Homepage', desc: 'Build a custom public-facing club homepage with news, match results, galleries, and more.' },
  ClubHomepageAdmin: { key: 'module_homepage', name: 'Club Homepage', desc: 'Build a custom public-facing club homepage with news, match results, galleries, and more.' },
  FunctionRoomAdmin: { key: 'module_function_rooms', name: 'Function Room Bookings', desc: 'Manage function room bookings, enquiries, and availability for your club facilities.' },
  ScorecardLayoutEditor: { key: 'module_custom_branding', name: 'Custom Branding', desc: 'Design custom scorecard layouts with your club branding, colours, and logo.' },
  ClubMessaging: { key: 'module_messaging', name: 'Club Messaging', desc: 'Chat with members in dedicated channels for announcements, social events, and selection discussions.' },
};

// Pages where the bottom tab bar starts hidden (revealed on scroll-up or via the floating handle)
const TAB_BAR_HIDDEN_BY_DEFAULT = ['BookRink', 'LeagueAdmin', 'SelectionEditor', 'ScorecardLayoutEditor', 'ClubSettings'];
// Pages where the bottom tab bar never shows
const TAB_BAR_NEVER_SHOW = ['RinkDisplayTV', 'LiveScoring'];

// TODO: Replace with the real Stripe Payment Link URL once created in the Stripe dashboard
const STRIPE_PAYMENT_LINK_URL = 'https://buy.stripe.com/28EfZjgiC0K81Hb5mKak000';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const { kioskMember } = useKiosk();
  const isKioskSession = !!kioskMember;

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

  // All approved memberships for this user (for club switcher)
  const { data: allMemberships = [] } = useQuery({
    queryKey: ['allMyMemberships', user?.email],
    queryFn: () => base44.entities.ClubMembership.filter({ user_email: user.email, status: 'approved' }),
    enabled: !!user?.email,
  });

  // Fetch all active clubs in a single query, then filter to only ones the user is a member of
  const { data: allClubs = [] } = useQuery({
    queryKey: ['allActiveClubs'],
    queryFn: () => base44.entities.Club.filter({ is_active: true }),
    enabled: allMemberships.length > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const memberClubIds = new Set(allMemberships.map(m => m.club_id));
  const allMyClubs = allClubs.filter(c => c.id !== clubId && memberClubIds.has(c.id));

  const queryClient = useQueryClient();
  const { value: bottomNavEnabled } = usePlatformSetting('mobile_bottom_nav_enabled', false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [tabBarHidden, setTabBarHidden] = useState(TAB_BAR_HIDDEN_BY_DEFAULT.includes(currentPageName));
  const [atTop, setAtTop] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollRafRef = useRef(null);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Reset the tab bar visibility when navigating between pages
  useEffect(() => {
    setTabBarHidden(TAB_BAR_HIDDEN_BY_DEFAULT.includes(currentPageName));
  }, [currentPageName]);

  // Auto-hide the tab bar on scroll-down, reveal on scroll-up or back at the top
  useEffect(() => {
    if (!bottomNavEnabled) return;
    if (TAB_BAR_NEVER_SHOW.includes(currentPageName)) return;
    const onScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        if (window.innerWidth >= 768) return;
        const y = window.scrollY;
        const last = lastScrollYRef.current;
        setAtTop(y <= 24);
        if (y <= 24) {
          setTabBarHidden(TAB_BAR_HIDDEN_BY_DEFAULT.includes(currentPageName));
        } else if (y > last + 1) {
          setTabBarHidden(true);
        } else if (y < last - 1) {
          setTabBarHidden(false);
        }
        lastScrollYRef.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [bottomNavEnabled, currentPageName]);

  // Pages that don't need club context
  const noClubPages = ['ClubSelector', 'PlatformAdmin', 'ClubAnalyticsDashboard', 'PlatformInvoices', 'InvoiceView', 'CountyHome', 'CountyMembers', 'CountySelections', 'CountySquads', 'CountyAffiliations', 'CountyAdmin', 'CountyTournaments', 'CountyTournamentEditor', 'CountyTournamentView', 'CountyRegistration', 'CountyEntriesAdmin'];
  const needsClub = !noClubPages.includes(currentPageName);

  // Pages that non-members can access even with a clubId
  const publicClubPages = ['ClubSelector', 'PlatformAdmin', 'Profile', 'ProfileSetup', 'Feedback'];
  const requiresMembership = clubId && needsClub && !publicClubPages.includes(currentPageName);

  // Block access if clubId is present but user is not an approved member
  // Also wait for user to load to avoid a flash before auth resolves
  if (requiresMembership && user && !membershipLoading && membership !== undefined && (!membership || membership.status !== 'approved')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have an approved membership for this club.</p>
          <Link to={createPageUrl('ClubSelector')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Club Selector</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const onboardingRemaining = isClubAdmin && club ? ONBOARDING_ITEMS.filter(item => !(club.onboarding_completed_items || []).includes(item.key)).length : 0;
  const isFreeClub = club?.club_tier === 'free';
  const lockedModule = isFreeClub && needsClub && clubId ? MODULE_PAGE_MAP[currentPageName] : null;
  const isModuleLocked = lockedModule && club?.[lockedModule.key] === false;
  const isClubSteward = membership?.role === 'steward' && membership?.status === 'approved';
  const isSelector = (membership?.role === 'selector' || membership?.role === 'admin') && membership?.status === 'approved';
  const isPlatformAdmin = user?.role === 'admin';

  const showHome = club?.module_homepage || isFreeClub;
  const showRinkBooking = club?.module_rink_booking !== false || isFreeClub;
  const showSelection = club?.module_selection !== false || isFreeClub;
  const showCompetitions = club?.module_competitions !== false || isFreeClub;
  const showLeagues = club?.module_leagues !== false || isFreeClub;

  // Mobile menu — sections mirror the desktop dropdown groups
  const mobilePlainLinks = [
    ...(showHome ? [{ name: 'Home', href: createPageUrl('ClubHome') + `?clubId=${clubId}`, icon: Building2 }] : []),
    ...(showLeagues ? [{ name: 'My Teams', href: createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`, icon: Users }] : []),
    ...(isClubSteward ? [{ name: 'Bookings', href: createPageUrl('AdminBookings') + `?clubId=${clubId}`, icon: ShieldCheck }] : []),
  ];

  const mobileMenuSections = [
    ...(showRinkBooking ? [{
      title: 'Rink Booking', icon: Calendar,
      items: [
        { name: 'Book a Rink', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar },
        { name: 'My Bookings', href: createPageUrl('MyBookings') + `?clubId=${clubId}`, icon: CalendarCheck },
      ],
    }] : []),
    ...(showSelection ? [{
      title: 'Selection', icon: ClipboardList,
      items: [
        { name: 'Match Selection', href: createPageUrl('Selection') + `?clubId=${clubId}`, icon: ClipboardList },
        { name: 'Competition Availability', href: createPageUrl('CompetitionAvailability') + `?clubId=${clubId}`, icon: Star },
        ...(showLeagues ? [{ name: 'Club Fixtures', href: createPageUrl('ClubFixtures') + `?clubId=${clubId}`, icon: CalendarDays }] : []),
      ],
    }] : []),
    ...(showCompetitions ? [{
      title: 'Competitions', icon: Trophy,
      items: [
        { name: 'Competition Draw', href: createPageUrl('ClubTournaments') + `?clubId=${clubId}`, icon: Trophy },
        ...(club?.competition_registration_enabled ? [{ name: 'Competition Entries', href: createPageUrl('CompetitionRegistration') + `?clubId=${clubId}`, icon: ListChecks }] : []),
        ...(club?.competition_registration_enabled && isClubAdmin ? [{ name: 'Entries Admin', href: createPageUrl('CompetitionEntriesAdmin') + `?clubId=${clubId}`, icon: Download }] : []),
      ],
    }] : []),
    {
      title: 'My Club', icon: Users,
      items: [
        ...(isClubAdmin ? [{ name: 'Getting Started', href: createPageUrl('OnboardingChecklist') + `?clubId=${clubId}`, icon: Rocket, badge: onboardingRemaining }] : []),
        { name: 'Club Officers', href: createPageUrl('ClubOfficers') + `?clubId=${clubId}`, icon: Award },
        { name: 'Member Directory', href: createPageUrl('MemberDirectory') + `?clubId=${clubId}`, icon: BookOpen },
        { name: 'Score Prediction', href: createPageUrl('ScorePrediction') + `?clubId=${clubId}`, icon: Target },
        ...((club?.module_messaging || isFreeClub) ? [{ name: 'Club Chat', href: createPageUrl('ClubMessaging') + `?clubId=${clubId}`, icon: MessagesSquare }] : []),
      ],
    },
    ...(isClubAdmin ? [{
      title: 'Admin', icon: ShieldCheck,
      items: [
        ...(showLeagues ? [{ name: 'Leagues', href: createPageUrl('LeagueAdmin') + `?clubId=${clubId}`, icon: Table2 }] : []),
        ...(showLeagues ? [{ name: 'Fixtures', href: createPageUrl('ClubFixtures') + `?clubId=${clubId}`, icon: CalendarDays }] : []),
        { name: 'Bookings Admin', href: createPageUrl('AdminBookings') + `?clubId=${clubId}`, icon: ShieldCheck },
        { name: 'TV Display', href: createPageUrl('RinkDisplayTV') + `?clubId=${clubId}`, icon: Calendar },
        { name: 'Members', href: createPageUrl('ClubAdmin') + `?clubId=${clubId}`, icon: Users },
        { name: 'Open Competitions', href: createPageUrl('OpenCompetitions') + `?clubId=${clubId}`, icon: Trophy },
        ...((club?.module_function_rooms || isFreeClub) ? [{ name: 'Function Rooms', href: createPageUrl('FunctionRoomAdmin') + `?clubId=${clubId}`, icon: Building2 }] : []),
        { name: 'Dashboard', href: createPageUrl('AdminDashboard') + `?clubId=${clubId}`, icon: LayoutDashboard },
        { name: 'Club Admin', href: createPageUrl('Clubsettings') + `?clubId=${clubId}`, icon: Settings },
        { name: 'Bowls Time Invoices', href: createPageUrl('BowlsTimeInvoices') + `?clubId=${clubId}`, icon: Receipt },
      ],
    }] : []),
    ...(!isKioskSession && allMyClubs.length > 0 ? [{
      title: 'Switch Club', icon: Building2,
      items: [
        ...allMyClubs.map(c => ({ name: c.name, href: createPageUrl('BookRink') + `?clubId=${c.id}`, icon: Building2 })),
        { name: 'All Clubs', href: createPageUrl('ClubSelector') + '?switchClubs=true', icon: Building2 },
      ],
    }] : []),
  ];

  // Kiosk members only get the Rink Booking section
  const visibleMobileSections = isKioskSession
    ? mobileMenuSections.filter(s => s.title === 'Rink Booking')
    : mobileMenuSections;

  // ---- Mobile bottom tab bar (when the platform setting is ON) ----
  // Unread notifications come from the cache shared with NotificationDropdown — no extra query
  const cachedNotifications = queryClient.getQueryData(['notifications', user?.email]);
  const unreadCount = Array.isArray(cachedNotifications) ? cachedNotifications.filter(n => !n.is_read).length : 0;

  const tabCandidates = [
    ...(showHome ? [{ label: 'Home', href: createPageUrl('ClubHome') + `?clubId=${clubId}`, icon: Building2 }] : []),
    ...(showRinkBooking ? [{ label: 'Book', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar }] : []),
    ...(showSelection ? [{ label: 'Selection', href: createPageUrl('Selection') + `?clubId=${clubId}`, icon: ClipboardList }] : []),
    ...(showLeagues ? [{ label: 'Fixtures', href: createPageUrl(isClubAdmin ? 'LeagueAdmin' : 'LeagueView') + `?clubId=${clubId}`, icon: Table2 }] : []),
    ...((club?.module_messaging || isFreeClub) ? [{ label: 'Chat', href: createPageUrl('ClubMessaging') + `?clubId=${clubId}`, icon: MessagesSquare, unread: unreadCount > 0 }] : []),
  ];
  // Kiosk: only Book a Rink and My Bookings, no More tab
  const tabItems = isKioskSession
    ? [
        { label: 'Book', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar },
        { label: 'My Bookings', href: createPageUrl('MyBookings') + `?clubId=${clubId}`, icon: CalendarCheck },
      ]
    : tabCandidates.slice(0, 4);
  const tabHrefs = new Set(tabItems.map(t => t.href));
  const showMoreTab = !isKioskSession;

  const moreSheetGroups = (!isKioskSession && bottomNavEnabled) ? [
    ...(showRinkBooking ? [{
      title: 'Play',
      items: [
        { name: 'Book a Rink', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar },
        { name: 'My Bookings', href: createPageUrl('MyBookings') + `?clubId=${clubId}`, icon: CalendarCheck },
      ],
    }] : []),
    ...(showSelection || showLeagues ? [{
      title: 'Teams',
      items: [
        ...(showSelection ? [
          { name: 'Selection', href: createPageUrl('Selection') + `?clubId=${clubId}`, icon: ClipboardList },
          { name: 'Competition Availability', href: createPageUrl('CompetitionAvailability') + `?clubId=${clubId}`, icon: Star },
        ] : []),
        ...(showLeagues ? [
          { name: 'My Teams', href: createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`, icon: Users },
          { name: 'Fixtures', href: createPageUrl('ClubFixtures') + `?clubId=${clubId}`, icon: CalendarDays },
          { name: 'Leagues', href: createPageUrl(isClubAdmin ? 'LeagueAdmin' : 'LeagueView') + `?clubId=${clubId}`, icon: Table2 },
        ] : []),
        { name: 'Score Prediction', href: createPageUrl('ScorePrediction') + `?clubId=${clubId}`, icon: Target },
      ],
    }] : []),
    ...(showCompetitions ? [{
      title: 'Competitions',
      items: [
        { name: 'Competition Draw', href: createPageUrl('ClubTournaments') + `?clubId=${clubId}`, icon: Trophy },
        ...(club?.competition_registration_enabled ? [{ name: 'Competition Entries', href: createPageUrl('CompetitionRegistration') + `?clubId=${clubId}`, icon: ListChecks }] : []),
      ],
    }] : []),
    {
      title: 'Club',
      items: [
        ...(showHome ? [{ name: 'Club Home', href: createPageUrl('ClubHome') + `?clubId=${clubId}`, icon: Building2 }] : []),
        { name: 'Club Officers', href: createPageUrl('ClubOfficers') + `?clubId=${clubId}`, icon: Award },
        { name: 'Member Directory', href: createPageUrl('MemberDirectory') + `?clubId=${clubId}`, icon: BookOpen },
        ...((club?.module_messaging || isFreeClub) ? [{ name: 'Club Chat', href: createPageUrl('ClubMessaging') + `?clubId=${clubId}`, icon: MessagesSquare }] : []),
        { name: 'Help Centre', href: createPageUrl('HelpCentre'), icon: LifeBuoy },
      ],
    },
    ...((isClubAdmin || isClubSteward) ? [{
      title: 'Admin',
      items: [
        ...(isClubSteward ? [{ name: 'Bookings', href: createPageUrl('AdminBookings') + `?clubId=${clubId}`, icon: ShieldCheck }] : []),
        ...(isClubAdmin ? [
          { name: 'Bookings Admin', href: createPageUrl('AdminBookings') + `?clubId=${clubId}`, icon: ShieldCheck },
          { name: 'Members', href: createPageUrl('ClubAdmin') + `?clubId=${clubId}`, icon: Users },
          { name: 'Open Competitions', href: createPageUrl('OpenCompetitions') + `?clubId=${clubId}`, icon: Trophy },
          ...((club?.module_function_rooms || isFreeClub) ? [{ name: 'Function Rooms', href: createPageUrl('FunctionRoomAdmin') + `?clubId=${clubId}`, icon: Building2 }] : []),
          { name: 'Dashboard', href: createPageUrl('AdminDashboard') + `?clubId=${clubId}`, icon: LayoutDashboard },
        ] : []),
      ],
    }] : []),
    ...((!isKioskSession && allMyClubs.length > 0) ? [{
      title: 'Switch club',
      items: [
        ...allMyClubs.map(c => ({ name: c.name, href: createPageUrl('BookRink') + `?clubId=${c.id}`, icon: Building2 })),
        { name: 'All Clubs', href: createPageUrl('ClubSelector') + '?switchClubs=true', icon: Building2 },
      ],
    }] : []),
  ].map(g => ({ ...g, items: g.items.filter(i => !tabHrefs.has(i.href)) })).filter(g => g.items.length > 0) : [];

  const tabBarNeverShow = !bottomNavEnabled || !needsClub || !clubId || isModuleLocked || TAB_BAR_NEVER_SHOW.includes(currentPageName);
  const showTabBar = !tabBarNeverShow && tabItems.length > 0 && (moreSheetOpen || !tabBarHidden);
  const tabBarPaddingClass = !tabBarNeverShow && tabItems.length > 0 && (showTabBar || (!TAB_BAR_HIDDEN_BY_DEFAULT.includes(currentPageName) && atTop))
    ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'
    : '';

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
          <div className={cn("flex items-center justify-between", bottomNavEnabled ? "h-12 md:h-16" : "h-16")}>
            {/* Logo */}
            <Link to={createPageUrl('ClubSelector')} className="flex items-center gap-3 shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png"
                alt="BowlsTime"
                className={bottomNavEnabled ? "w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover" : "w-10 h-10 rounded-xl object-cover"}
              />
              <div className={bottomNavEnabled ? "min-w-0 max-w-[9rem] md:max-w-none" : "hidden sm:block"}>
                <span className={cn("block font-semibold text-gray-900", bottomNavEnabled ? "truncate" : "whitespace-nowrap")}>
                  {club?.name || 'BowlsTime'}
                </span>
              </div>
            </Link>

            {/* Help Centre — mobile only, next to logo (hidden when the bottom tab bar is on) */}
            {!bottomNavEnabled && (
              <Link
                to={createPageUrl('HelpCentre')}
                className="sm:hidden flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-full shadow-md transition-all hover:scale-105 ml-1"
              >
                <LifeBuoy className="w-4 h-4" />
                <span className="text-sm font-medium">Help Centre</span>
              </Link>
            )}

            {/* Desktop Navigation */}
            {needsClub && clubId && (
              <nav className="hidden md:flex items-center gap-2">
                {/* Club Home — hidden in kiosk mode */}
                {!isKioskSession && (club?.module_homepage || isFreeClub) && (
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
                {(club?.module_rink_booking !== false || isFreeClub) && (
                  isKioskSession ? (
                    // Kiosk: show only Book a Rink and My Bookings as plain links (no dropdown)
                    <>
                      <Link
                        to={createPageUrl('BookRink') + `?clubId=${clubId}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive(createPageUrl('BookRink'))
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <Calendar className="w-4 h-4" />
                        Book a Rink
                      </Link>
                      <Link
                        to={createPageUrl('MyBookings') + `?clubId=${clubId}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive(createPageUrl('MyBookings'))
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <CalendarCheck className="w-4 h-4" />
                        My Bookings
                      </Link>
                    </>
                  ) : (
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
                  )
                )}

                {/* Selection Dropdown — hidden in kiosk mode */}
                {!isKioskSession && (club?.module_selection !== false || isFreeClub) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        (isActive(createPageUrl('Selection')) || isActive(createPageUrl('ClubFixtures')))
                          ? "text-emerald-700"
                          : "text-gray-600 hover:text-gray-900"
                      )}>
                        <ClipboardList className="w-4 h-4" />
                        Selection
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Selection') + `?clubId=${clubId}`} className="cursor-pointer">
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Match Selection
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('CompetitionAvailability') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Star className="w-4 h-4 mr-2" />
                          Competition Availability
                        </Link>
                      </DropdownMenuItem>
                      {(club?.module_leagues !== false || isFreeClub) && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ClubFixtures') + `?clubId=${clubId}`} className="cursor-pointer">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Club Fixtures
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Competitions Dropdown — hidden in kiosk mode */}
                {!isKioskSession && (club?.module_competitions !== false || isFreeClub) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <Trophy className="w-4 h-4" />
                        Competitions
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Trophy className="w-4 h-4 mr-2" />
                          Competition Draw
                        </Link>
                      </DropdownMenuItem>
                      {club?.competition_registration_enabled && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('CompetitionRegistration') + `?clubId=${clubId}`} className="cursor-pointer">
                            <ListChecks className="w-4 h-4 mr-2" />
                            Competition Entries
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {club?.competition_registration_enabled && isClubAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('CompetitionEntriesAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Download className="w-4 h-4 mr-2" />
                            Entries Admin
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* My Teams — hidden in kiosk mode */}
                {!isKioskSession && (club?.module_leagues !== false || isFreeClub) && (
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

                {/* My Club Dropdown — hidden in kiosk mode */}
                {!isKioskSession && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <Users className="w-4 h-4" />
                        My Club
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {isClubAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('OnboardingChecklist') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Rocket className="w-4 h-4 mr-2" />
                            Getting Started
                            {onboardingRemaining > 0 && (
                              <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-2 py-0.5">
                                {onboardingRemaining}
                              </span>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('ClubOfficers') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Award className="w-4 h-4 mr-2" />
                          Club Officers
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('MemberDirectory') + `?clubId=${clubId}`} className="cursor-pointer">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Member Directory
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('ScorePrediction') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Target className="w-4 h-4 mr-2" />
                          Score Prediction
                        </Link>
                      </DropdownMenuItem>
                      {(club?.module_messaging || isFreeClub) && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ClubMessaging') + `?clubId=${clubId}`} className="cursor-pointer">
                            <MessagesSquare className="w-4 h-4 mr-2" />
                            Club Chat
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Bookings Admin link for stewards — hidden in kiosk mode */}
                {!isKioskSession && isClubSteward && (
                  <Link
                    to={createPageUrl('AdminBookings') + `?clubId=${clubId}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(createPageUrl('AdminBookings'))
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Bookings
                  </Link>
                )}

                {/* Admin Dropdown — hidden in kiosk mode */}
                {!isKioskSession && isClubAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <ShieldCheck className="w-4 h-4" />
                        Admin
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(club?.module_leagues !== false || isFreeClub) && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('LeagueAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Table2 className="w-4 h-4 mr-2" />
                            Leagues
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(club?.module_leagues !== false || isFreeClub) && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ClubFixtures') + `?clubId=${clubId}`} className="cursor-pointer">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Fixtures
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
                      {(club?.module_function_rooms || isFreeClub) && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('FunctionRoomAdmin') + `?clubId=${clubId}`} className="cursor-pointer">
                            <Building2 className="w-4 h-4 mr-2" />
                            Function Rooms
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AdminDashboard') + `?clubId=${clubId}`} className="cursor-pointer">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Clubsettings') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Club Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BowlsTimeInvoices') + `?clubId=${clubId}`} className="cursor-pointer">
                          <Receipt className="w-4 h-4 mr-2" />
                          Bowls Time Invoices
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
            {needsClub && clubId && !isKioskSession && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-normal">
                    <Building2 className="w-4 h-4" />
                    Switch Club
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Club</div>
                  <DropdownMenuItem disabled className="text-gray-700 font-medium opacity-100 cursor-default">
                    <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                    {club?.name || '—'}
                  </DropdownMenuItem>
                  {allMyClubs.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Switch To</div>
                      {allMyClubs.map(c => (
                        <DropdownMenuItem key={c.id} asChild>
                          <Link to={createPageUrl('BookRink') + `?clubId=${c.id}`} className="cursor-pointer">
                            <Building2 className="w-4 h-4 mr-2" />
                            {c.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('ClubSelector') + '?switchClubs=true'} className="cursor-pointer text-gray-500">
                      <Building2 className="w-4 h-4 mr-2" />
                      All Clubs
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user?.email && <NotificationDropdown userEmail={user.email} clubId={clubId} />}

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

              {/* Mobile Menu Button — hidden when the bottom tab bar is on */}
              {needsClub && clubId && !bottomNavEnabled && (
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

        {/* Mobile Navigation — collapsible sections mirroring the desktop dropdown groups (hamburger mode) */}
        {mobileMenuOpen && needsClub && clubId && !bottomNavEnabled && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3">
              {(!isKioskSession ? mobilePlainLinks : []).map((item) => (
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
              <Accordion
                type="single"
                collapsible
                defaultValue={visibleMobileSections.find(s => s.items.some(i => isActive(i.href)))?.title}
                className="mt-1"
              >
                {visibleMobileSections.map(section => (
                  <AccordionItem key={section.title} value={section.title} className="border-b border-gray-100 last:border-0">
                    <AccordionTrigger className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:no-underline hover:bg-gray-50 rounded-lg">
                      <span className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 text-gray-500" />
                        {section.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2 pt-0">
                      <div className="pl-4 space-y-0.5">
                        {section.items.map(item => (
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
                            {item.badge > 0 && (
                              <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-2 py-0.5">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={cn('min-h-0 pb-safe', tabBarPaddingClass)}>
        {isModuleLocked ? (
          <ModuleLockedNotice moduleKey={lockedModule.key} moduleName={lockedModule.name} description={lockedModule.desc} clubId={clubId} />
        ) : children}
      </main>
      
      <footer className="py-4 text-center border-t border-gray-100 space-y-2">
        {currentPageName !== 'ClubHome' && (
          <a href={STRIPE_PAYMENT_LINK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <Coffee className="w-3.5 h-3.5" />
            Enjoying Bowls Time? Show your appreciation
          </a>
        )}
        <LegalFooterLinks />
      </footer>

      {/* Mobile Bottom Tab Bar (bottom navigation mode) */}
      {!tabBarNeverShow && tabItems.length > 0 && (
        <nav
          aria-label="Main"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200",
            !reducedMotion && "transition-transform duration-200 ease-out",
            showTabBar ? "translate-y-0" : "translate-y-full"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className={cn("grid", showMoreTab ? "grid-cols-5" : "grid-cols-2")}>
            {tabItems.map(tab => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.label}
                  to={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 focus:outline-none focus-visible:bg-emerald-50",
                    active ? "text-emerald-700" : "text-gray-500"
                  )}
                >
                  {active && <span className="absolute top-0 h-0.5 w-8 bg-emerald-700 rounded-full" />}
                  <tab.icon className="w-[22px] h-[22px]" />
                  <span className="text-[11px] font-medium leading-none">{tab.label}</span>
                  {tab.unread && (
                    <span className="absolute top-1.5 left-1/2 translate-x-3 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Link>
              );
            })}
            {showMoreTab && (
              <button
                type="button"
                onClick={() => setMoreSheetOpen(true)}
                aria-current={moreSheetOpen ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 focus:outline-none focus-visible:bg-emerald-50",
                  moreSheetOpen ? "text-emerald-700" : "text-gray-500"
                )}
              >
                {moreSheetOpen && <span className="absolute top-0 h-0.5 w-8 bg-emerald-700 rounded-full" />}
                <MoreHorizontal className="w-[22px] h-[22px]" />
                <span className="text-[11px] font-medium leading-none">More</span>
                {unreadCount > 0 && !tabItems.some(t => t.unread) && (
                  <span className="absolute top-1.5 left-1/2 translate-x-3 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Floating handle to reveal the tab bar when it is hidden */}
      {!tabBarNeverShow && tabItems.length > 0 && !showTabBar && !moreSheetOpen && (
        <button
          type="button"
          aria-label="Show navigation"
          onClick={() => setTabBarHidden(false)}
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 md:hidden w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* More bottom sheet (bottom navigation mode) */}
      {bottomNavEnabled && !isKioskSession && (
        <Drawer open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <DrawerContent className="max-h-[80vh] overflow-y-auto">
            <DrawerTitle className="sr-only">More</DrawerTitle>
            <div className="px-4 pb-6">
              {moreSheetGroups.map(group => (
                <div key={group.title} className="mb-3 last:mb-0">
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{group.title}</div>
                  {group.items.map(item => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMoreSheetOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium",
                        isActive(item.href)
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                      {isActive(item.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Context-sensitive help pop-up for club admins and selectors */}
      {needsClub && clubId && (
        <PageHelpPopup
          pageName={currentPageName}
          user={user}
          clubId={clubId}
          isClubAdmin={isClubAdmin}
          isSelector={isSelector}
          suppress={isKioskSession || isModuleLocked}
        />
      )}

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton />
    </div>
  );
}