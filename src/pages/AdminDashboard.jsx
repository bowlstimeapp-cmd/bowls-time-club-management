import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  subMonths, isAfter, isBefore, startOfToday, addHours, isWithinInterval,
  subDays, differenceInCalendarDays
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Clock, Calendar, AlertTriangle, ArrowLeft, CheckCircle,
  ShieldAlert, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── helpers ──────────────────────────────────────────────────────────────────

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

function possibleSlotsPerDay(club) {
  if (!club) return 0;
  const rinks = club.rink_count || 6;
  if (club.use_custom_sessions && club.custom_sessions?.length > 0) {
    return club.custom_sessions.length * rinks;
  }
  const [oh, om = 0] = (club.opening_time || '10:00').split(':').map(Number);
  const [ch, cm = 0] = (club.closing_time || '21:00').split(':').map(Number);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  const dur = (club.session_duration || 2) * 60;
  return Math.floor((closeMins - openMins) / dur) * rinks;
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent, onClick, isLoading }) {
  return (
    <div
      className={cn('bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={onClick}
    >
      <div className={cn('p-2.5 rounded-lg', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        {isLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── bookings table ────────────────────────────────────────────────────────────

function BookingsTable({ bookings, showApprovedBy }) {
  if (!bookings.length) return <p className="text-sm text-gray-400 text-center py-6">No bookings to show.</p>;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left py-2 pr-3 font-medium">Who</th>
              <th className="text-left py-2 pr-3 font-medium">Rink</th>
              <th className="text-left py-2 pr-3 font-medium">Session</th>
              <th className="text-left py-2 pr-3 font-medium">Type</th>
              <th className="text-left py-2 pr-3 font-medium">Booked at</th>
              {showApprovedBy && <th className="text-left py-2 pr-3 font-medium">Approved by</th>}
              <th className="text-left py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="py-2 pr-3 font-medium text-gray-800 whitespace-nowrap">{b.booker_name || '—'}</td>
                <td className="py-2 pr-3 text-gray-600">Rink {b.rink_number}</td>
                <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                  {b.date ? format(parseISO(b.date), 'EEE d MMM') : '—'} · {b.start_time}–{b.end_time}
                </td>
                <td className="py-2 pr-3">
                  {b.competition_type ? (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{b.competition_type}</span>
                  ) : '—'}
                </td>
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  {b.created_date ? format(new Date(b.created_date), 'd MMM, HH:mm') : '—'}
                </td>
                {showApprovedBy && (
                  <td className="py-2 pr-3 text-gray-500">{b.approved_by_name || b.approved_by_email || '—'}</td>
                )}
                <td className="py-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_BADGE[b.status] || STATUS_BADGE.pending)}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {bookings.map(b => (
          <div key={b.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-800">{b.booker_name || '—'}</span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_BADGE[b.status] || STATUS_BADGE.pending)}>
                {b.status}
              </span>
            </div>
            <p className="text-gray-500">Rink {b.rink_number} · {b.date ? format(parseISO(b.date), 'EEE d MMM') : '—'} · {b.start_time}–{b.end_time}</p>
            {b.competition_type && <p className="text-gray-400 text-xs mt-0.5">{b.competition_type}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const pendingRef = useRef(null);

  // Booking summary toggle
  const [bookingView, setBookingView] = useState('recent'); // 'recent' | 'next24'

  // Booking report month
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

  // ── derived data ────────────────────────────────────────────────────────────

  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');

  const activeBookings = allBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');

  // Section 1 — booking views
  const recentBookings = [...activeBookings]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 50);

  const now = new Date();
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

  const displayedBookings = bookingView === 'recent' ? recentBookings : next24Bookings;

  // Section 2 — occupancy chart
  const monthBookings = activeBookings.filter(b => {
    if (!b.date) return false;
    const d = parseISO(b.date);
    return d.getFullYear() === selectedMonth.year && (d.getMonth() + 1) === selectedMonth.month;
  });

  const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const slotsPerDay = possibleSlotsPerDay(club);

  const occupancyData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const booked = monthBookings.filter(b => b.date === dayStr).length;
    const pct = slotsPerDay > 0 ? Math.min(Math.round((booked / slotsPerDay) * 100), 100) : 0;
    return {
      day: day.getDate(),
      dow: format(day, 'EEE'),
      pct,
      booked,
      dateLabel: format(day, 'd MMM'),
    };
  });

  // Section 3 — members
  const approvedMembers = allMemberships.filter(m => m.status === 'approved');
  const pendingMembers = allMemberships.filter(m => m.status === 'pending');

  // New members per month (last 12)
  const memberMonthCounts = {};
  approvedMembers.forEach(m => {
    if (!m.created_date) return;
    const key = format(new Date(m.created_date), 'MMM yy');
    memberMonthCounts[key] = (memberMonthCounts[key] || 0) + 1;
  });
  const memberMonthData = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    const key = format(d, 'MMM yy');
    return { month: key, count: memberMonthCounts[key] || 0 };
  });

  // Recently active (last 7 days)
  const sevenDaysAgo = subDays(today, 7);
  const recentlyActive = approvedMembers.filter(m => {
    if (!m.last_login_date) return false;
    return new Date(m.last_login_date) >= sevenDaysAgo;
  }).sort((a, b) => new Date(b.last_login_date) - new Date(a.last_login_date));

  // Section 4 — leagues
  const leagueMap = Object.fromEntries(leagues.map(l => [l.id, l]));
  const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));

  const missingResults = allFixtures.filter(f => {
    if (f.status === 'completed' || f.status === 'cancelled') return false;
    return f.match_date < todayStr;
  });

  // Group missing results by league
  const missingByLeague = {};
  missingResults.forEach(f => {
    const leagueName = leagueMap[f.league_id]?.name || 'Unknown League';
    if (!missingByLeague[leagueName]) missingByLeague[leagueName] = [];
    missingByLeague[leagueName].push(f);
  });

  // Score clashes: fixtures on same date & rink with overlapping times
  const clashPairs = [];
  const timeToMins = t => {
    if (!t) return 0;
    const [h, m = 0] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const getFixtureTimes = (f) => {
    const league = leagueMap[f.league_id];
    return {
      start: timeToMins(league?.start_time),
      end: timeToMins(league?.end_time),
    };
  };
  const fixturesWithTimes = allFixtures
    .filter(f => f.rink_number && f.match_date && leagueMap[f.league_id]?.start_time && leagueMap[f.league_id]?.end_time)
    .map(f => ({ ...f, ...getFixtureTimes(f) }));

  for (let i = 0; i < fixturesWithTimes.length; i++) {
    for (let j = i + 1; j < fixturesWithTimes.length; j++) {
      const a = fixturesWithTimes[i];
      const b = fixturesWithTimes[j];
      if (a.match_date !== b.match_date || a.rink_number !== b.rink_number) continue;
      // overlap check
      if (a.start < b.end && b.start < a.end) {
        clashPairs.push([a, b]);
      }
    }
  }

  // ── summary stats ────────────────────────────────────────────────────────────
  const thisMonthBookings = activeBookings.filter(b => {
    if (!b.date) return false;
    const d = parseISO(b.date);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  });

  const isLoading = bookingsLoading || membershipsLoading;

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
          <StatCard
            icon={Users}
            label="Approved members"
            value={approvedMembers.length}
            accent="bg-emerald-50 text-emerald-600"
            isLoading={membershipsLoading}
          />
          <StatCard
            icon={Clock}
            label="Pending approval"
            value={pendingMembers.length}
            accent="bg-amber-50 text-amber-600"
            isLoading={membershipsLoading}
            onClick={() => pendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <StatCard
            icon={Calendar}
            label="Bookings this month"
            value={thisMonthBookings.length}
            accent="bg-blue-50 text-blue-600"
            isLoading={bookingsLoading}
          />
          <StatCard
            icon={AlertTriangle}
            label="Fixtures needing results"
            value={missingResults.length}
            accent="bg-red-50 text-red-600"
            isLoading={false}
          />
        </motion.div>

        {/* Row 2 — Booking report (left) + Bookings table (right) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        >
          {/* Booking report — 3/5 width */}
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
                    <BarChart data={occupancyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        formatter={(v, _n, props) => [`${v}% (${props.payload.booked} bookings)`, 'Occupancy']}
                        labelFormatter={l => {
                          const entry = occupancyData.find(d => d.day === l);
                          return entry ? `${entry.dateLabel} (${entry.dow})` : l;
                        }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <ReferenceLine y={100} stroke="#d1fae5" strokeDasharray="4 2" />
                      <Bar dataKey="pct" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Weekday row */}
                  <div className="flex mt-1 overflow-hidden" style={{ paddingLeft: 12, paddingRight: 8 }}>
                    {occupancyData.map(d => (
                      <div key={d.day} className="flex-1 text-center text-gray-400" style={{ fontSize: 9 }}>
                        {d.dow.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings summary — 2/5 width */}
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
                  Recently Booked
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
            <CardContent className="overflow-auto max-h-72">
              {bookingsLoading ? <Skeleton className="h-40 w-full" /> : (
                <BookingsTable
                  bookings={displayedBookings}
                  showApprovedBy={!club?.auto_approve_bookings}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3 — Members detail (left) + League / Pending (right) */}
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
              {/* New members line chart */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">New members per month (last 12 months)</p>
                {membershipsLoading ? <Skeleton className="h-36 w-full" /> : (
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={memberMonthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="New members" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Recently active members (last 7 days)</p>
                {recentlyActive.length === 0 ? (
                  <p className="text-xs text-gray-400">Login activity data not available.</p>
                ) : (
                  <ul className="space-y-1">
                    {recentlyActive.map(m => (
                      <li key={m.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{m.user_name || m.user_email}</span>
                        <span className="text-xs text-gray-400">
                          {m.last_login_date ? format(new Date(m.last_login_date), 'd MMM, HH:mm') : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* League + Pending card */}
          <Card className="shadow-sm" ref={pendingRef}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">League & Membership</CardTitle>
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

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Approvals ({pendingMembers.length})
                </p>
                {pendingMembers.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    No pending approvals
                  </div>
                ) : (
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {pendingMembers.map(m => (
                      <li key={m.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{m.user_name || m.user_email}</span>
                        <span className="text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">pending</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}