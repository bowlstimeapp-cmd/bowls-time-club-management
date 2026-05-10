import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  subMonths, startOfToday, addHours, subHours
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Clock, Calendar, AlertTriangle, ArrowLeft, CheckCircle,
  ShieldAlert, LayoutDashboard, Mail, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending:  'bg-amber-100 text-amber-800 border-amber-200',
  cancelled:'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function buildMonthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return { label: format(d, 'MMMM yyyy'), year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent, onClick, isLoading, sub }) {
  return (
    <div
      className={cn('bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={onClick}
    >
      <div className={cn('p-2.5 rounded-lg shrink-0 mt-0.5', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        {isLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && !isLoading && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── booking list item ─────────────────────────────────────────────────────────

function BookingItem({ b }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 bg-emerald-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{b.booker_name || b.booker_email || '—'}</p>
        <p className="text-xs text-gray-500">
          Rink {b.rink_number} · {b.date ? format(parseISO(b.date), 'EEE d MMM') : '—'} · {b.start_time}–{b.end_time}
        </p>
      </div>
      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border shrink-0', STATUS_BADGE[b.status] || STATUS_BADGE.pending)}>
        {b.status}
      </span>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const pendingRef = useRef(null);
  const queryClient = useQueryClient();

  const [bookingView, setBookingView] = useState('recent');
  const monthOptions = buildMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState({ year: monthOptions[0].year, month: monthOptions[0].month });

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // Membership check
  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email }).then(r => r[0]),
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  // Club
  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => base44.entities.Club.filter({ id: clubId }).then(r => r[0]),
    enabled: !!clubId && isClubAdmin,
  });

  // All bookings
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['adminDashBookings', clubId],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // All memberships
  const { data: allMemberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['adminDashMemberships', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // Leagues
  const { data: leagues = [] } = useQuery({
    queryKey: ['adminDashLeagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // Fixtures
  const { data: allFixtures = [] } = useQuery({
    queryKey: ['adminDashFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // Teams
  const { data: allTeams = [] } = useQuery({
    queryKey: ['adminDashTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // Approve / reject via updateMembership backend function
  const approveMutation = useMutation({
    mutationFn: (membershipId) =>
      base44.functions.invoke('updateMembership', { action: 'approve', membershipId, clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDashMemberships', clubId] });
      toast.success('Member approved');
    },
    onError: () => toast.error('Failed to approve member'),
  });

  const rejectMutation = useMutation({
    mutationFn: (membershipId) =>
      base44.functions.invoke('updateMembership', { action: 'reject', membershipId, clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDashMemberships', clubId] });
      toast.success('Member rejected');
    },
    onError: () => toast.error('Failed to reject member'),
  });

  // ── derived data ────────────────────────────────────────────────────────────

  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const now = new Date();

  const activeBookings = allBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');

  // Bookings made in the last 48 hours
  const fortyEightHoursAgo = subHours(now, 48);
  const recentlyMadeBookings = allBookings
    .filter(b => b.created_date && new Date(b.created_date) >= fortyEightHoursAgo && b.status !== 'cancelled' && b.status !== 'rejected')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Bookings happening in the next 24 hours
  const in24h = addHours(now, 24);
  const next24Bookings = allBookings
    .filter(b => {
      if (b.status !== 'approved' && b.status !== 'pending') return false;
      if (!b.date || !b.start_time) return false;
      const slotTime = new Date(`${b.date}T${b.start_time}`);
      return slotTime >= now && slotTime <= in24h;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_time.localeCompare(b.start_time);
    });

  const displayedBookings = bookingView === 'recent' ? recentlyMadeBookings : next24Bookings;

  // Booking report — count per day in selected month
  const monthBookings = activeBookings.filter(b => {
    if (!b.date) return false;
    const d = parseISO(b.date);
    return d.getFullYear() === selectedMonth.year && (d.getMonth() + 1) === selectedMonth.month;
  });

  const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const bookingCountData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const count = monthBookings.filter(b => b.date === dayStr).length;
    return {
      day: day.getDate(),
      dow: format(day, 'EEE'),
      count,
      dateLabel: format(day, 'd MMM'),
    };
  });

  // Members
  const approvedMembers = allMemberships.filter(m => m.status === 'approved');
  const pendingMembers = allMemberships.filter(m => m.status === 'pending');

  // Members approved this calendar month
  const approvedThisMonth = approvedMembers.filter(m => {
    if (!m.updated_date && !m.created_date) return false;
    // Use updated_date as proxy for when status changed; fall back to created_date
    const d = new Date(m.updated_date || m.created_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  // New members approved per month (last 12) — by approval date (updated_date)
  const memberMonthCounts = {};
  approvedMembers.forEach(m => {
    const dateStr = m.updated_date || m.created_date;
    if (!dateStr) return;
    const key = format(new Date(dateStr), 'MMM yy');
    memberMonthCounts[key] = (memberMonthCounts[key] || 0) + 1;
  });
  const memberMonthData = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const key = format(d, 'MMM yy');
    return { month: key, count: memberMonthCounts[key] || 0 };
  });

  // Bookings this calendar month
  const thisMonthBookings = activeBookings.filter(b => {
    if (!b.date) return false;
    const d = parseISO(b.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  // Leagues
  const leagueMap = Object.fromEntries(leagues.map(l => [l.id, l]));
  const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));

  const missingResults = allFixtures.filter(f => {
    if (f.status === 'completed' || f.status === 'cancelled') return false;
    return f.match_date < todayStr;
  });

  const missingByLeague = {};
  missingResults.forEach(f => {
    const leagueName = leagueMap[f.league_id]?.name || 'Unknown League';
    if (!missingByLeague[leagueName]) missingByLeague[leagueName] = [];
    missingByLeague[leagueName].push(f);
  });

  // Score clashes
  const clashPairs = [];
  const timeToMins = t => {
    if (!t) return 0;
    const [h, m = 0] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const fixturesWithTimes = allFixtures
    .filter(f => f.rink_number && f.match_date && leagueMap[f.league_id]?.start_time && leagueMap[f.league_id]?.end_time)
    .map(f => ({
      ...f,
      start: timeToMins(leagueMap[f.league_id]?.start_time),
      end: timeToMins(leagueMap[f.league_id]?.end_time),
    }));

  for (let i = 0; i < fixturesWithTimes.length; i++) {
    for (let j = i + 1; j < fixturesWithTimes.length; j++) {
      const a = fixturesWithTimes[i];
      const b = fixturesWithTimes[j];
      if (a.match_date !== b.match_date || a.rink_number !== b.rink_number) continue;
      if (a.start < b.end && b.start < a.end) clashPairs.push([a, b]);
    }
  }

  // ── auth gate ─────────────────────────────────────────────────────────────────
  if (user && membership !== undefined && !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need club admin privileges to access this page.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Back to Rink Booking</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            to={createPageUrl('BookRink') + `?clubId=${clubId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Admin Dashboard</h1>
              {club && <p className="text-xs text-gray-500 mt-0.5">{club.name}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Row 1 — stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Approved Members */}
          <Card className="shadow-sm border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  {membershipsLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
                    <p className="text-2xl font-bold text-gray-900 leading-none">{approvedMembers.length}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Approved members</p>
                  {!membershipsLoading && approvedThisMonth.length > 0 && (
                    <div className="mt-2 border-t pt-2 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-emerald-700">{approvedThisMonth.length} approved this month</p>
                      {approvedThisMonth.map(m => (
                        <div key={m.id} className="text-xs text-gray-500">
                          <p className="font-medium text-gray-700 truncate">{m.user_name || '—'}</p>
                          <p className="truncate text-gray-400">{m.user_email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approval */}
          <Card className="shadow-sm border" ref={pendingRef}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  {membershipsLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
                    <p className="text-2xl font-bold text-gray-900 leading-none">{pendingMembers.length}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Pending approval</p>
                  {!membershipsLoading && pendingMembers.length > 0 && (
                    <div className="mt-2 border-t pt-2 space-y-2 max-h-48 overflow-y-auto">
                      {pendingMembers.map(m => (
                        <div key={m.id} className="text-xs">
                          <p className="font-medium text-gray-700 truncate">{m.user_name || '—'}</p>
                          <p className="text-gray-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" />{m.user_email}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => approveMutation.mutate(m.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="flex items-center gap-0.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(m.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="flex items-center gap-0.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!membershipsLoading && pendingMembers.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No pending requests</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings this month */}
          <StatCard
            icon={Calendar}
            label="Bookings this month"
            value={thisMonthBookings.length}
            accent="bg-blue-50 text-blue-600"
            isLoading={bookingsLoading}
            sub={`From ${format(startOfMonth(now), 'd MMM')} to today`}
          />

          {/* Fixtures needing results */}
          <StatCard
            icon={AlertTriangle}
            label="Fixtures needing results"
            value={missingResults.length}
            accent="bg-red-50 text-red-600"
            isLoading={false}
          />
        </motion.div>

        {/* Row 2 — Booking report (left) + Bookings list (right) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        >
          {/* Booking report */}
          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold">Booking Report</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">{monthBookings.length} bookings in selected month</p>
              </div>
              <Select
                value={`${selectedMonth.year}-${selectedMonth.month}`}
                onValueChange={v => {
                  const [y, m] = v.split('-').map(Number);
                  setSelectedMonth({ year: y, month: m });
                }}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? <Skeleton className="h-48 w-full" /> : (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bookingCountData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        formatter={(v, _n) => [v, 'Bookings']}
                        labelFormatter={l => {
                          const entry = bookingCountData.find(d => d.day === l);
                          return entry ? `${entry.dateLabel} (${entry.dow})` : l;
                        }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex mt-1 overflow-hidden" style={{ paddingLeft: 12, paddingRight: 8 }}>
                    {bookingCountData.map(d => (
                      <div key={d.day} className="flex-1 text-center text-gray-400" style={{ fontSize: 9 }}>
                        {d.dow.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings summary */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
              <CardTitle className="text-base font-semibold">Bookings</CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className={cn('h-7 px-2 text-xs', bookingView === 'recent' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : '')}
                  variant={bookingView === 'recent' ? 'default' : 'outline'}
                  onClick={() => setBookingView('recent')}
                >
                  Last 48h
                </Button>
                <Button
                  size="sm"
                  className={cn('h-7 px-2 text-xs', bookingView === 'next24' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : '')}
                  variant={bookingView === 'next24' ? 'default' : 'outline'}
                  onClick={() => setBookingView('next24')}
                >
                  Next 24h
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-auto max-h-72 p-4 pt-0">
              {bookingsLoading ? <Skeleton className="h-40 w-full" /> : (
                displayedBookings.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">No bookings to show.</p>
                  : displayedBookings.map(b => <BookingItem key={b.id} b={b} />)
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3 — Members chart (left) + Leagues (right) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Members card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Members approved per month (last 12 months)</p>
                {membershipsLoading ? <Skeleton className="h-36 w-full" /> : (
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={memberMonthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Members approved" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leagues card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leagues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Missing results */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Missing Results
                </p>
                {Object.keys(missingByLeague).length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    All results up to date
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(missingByLeague).map(([leagueName, fixtures]) => (
                      <div key={leagueName}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">{leagueName}</p>
                        {fixtures.map(f => (
                          <div key={f.id} className="text-xs text-gray-500 flex gap-2 py-0.5">
                            <span className="text-gray-400 shrink-0">{f.match_date ? format(parseISO(f.match_date), 'd MMM yyyy') : '—'}</span>
                            <span>{teamMap[f.home_team_id]?.name || 'TBD'} vs {teamMap[f.away_team_id]?.name || 'TBD'}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Score clashes */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Score Clashes
                </p>
                {clashPairs.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    No score clashes detected
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {clashPairs.map(([a, b], i) => (
                      <div key={i} className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="font-medium text-amber-700">{a.match_date} · Rink {a.rink_number}</p>
                        <p className="text-gray-600">{teamMap[a.home_team_id]?.name} vs {teamMap[a.away_team_id]?.name}</p>
                        <p className="text-gray-600">{teamMap[b.home_team_id]?.name} vs {teamMap[b.away_team_id]?.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}