import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, ShieldAlert, Building2, Users, Calendar, Mail, LogIn,
  MessageSquare, Send, Trophy, ShieldCheck, ArrowLeft, Layers,
} from 'lucide-react';
import ClubSearchSelect from '@/components/admin/ClubSearchSelect';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatPeriod(period, granularity) {
  if (!period) return '';
  if (granularity === 'month') {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }
  const d = new Date(period);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${accent}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallStat({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${accent}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, data, dataKey, color, type, note }) {
  const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{title}</CardTitle></CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-gray-400">No data yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              {type === 'line' ? (
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              )}
            </ResponsiveContainer>
            {note && <p className="text-xs text-gray-500 mt-2 italic">{note}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ClubAnalyticsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [granularity, setGranularity] = useState('month');
  const [showAllTime, setShowAllTime] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['allClubsAnalytics'],
    queryFn: () => base44.entities.Club.list('-created_date'),
  });

  const selectedClub = clubs.find(c => c.id === clubId);

  const { data: analytics, isError } = useQuery({
    queryKey: ['clubAnalytics', clubId, granularity],
    queryFn: async () => {
      const res = await base44.functions.invoke('getClubAnalytics', { club_id: clubId, granularity });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!clubId && !!user && user.role === 'admin',
  });

  // Visible series — last 12 months (month) or 30 days (day), unless "all time"
  const visibleSeries = useMemo(() => {
    if (!analytics?.series) return [];
    if (showAllTime) return analytics.series;
    const now = new Date();
    if (granularity === 'month') {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
      return analytics.series.filter(s => s.period >= cutoffKey);
    }
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    return analytics.series.filter(s => s.period >= cutoffKey);
  }, [analytics, showAllTime, granularity]);

  const chartData = useMemo(
    () => visibleSeries.map(s => ({ ...s, label: formatPeriod(s.period, granularity) })),
    [visibleSeries, granularity]
  );

  // Login tracking note — if earliest login is after club creation, tracking started later
  const loginNote = useMemo(() => {
    if (!analytics?.series) return null;
    const withLogins = analytics.series.filter(s => s.logins > 0);
    if (withLogins.length === 0) return null;
    const firstLoginPeriod = withLogins[0].period;
    const creationPeriod = analytics.series[0]?.period;
    if (creationPeriod && firstLoginPeriod > creationPeriod) {
      return `Login tracking started ${formatPeriod(firstLoginPeriod, granularity)} — earlier activity was not recorded.`;
    }
    return null;
  }, [analytics, granularity]);

  // Access check — independent enforcement, same pattern as PlatformAdmin.
  // Placed after all hooks so hook call order stays stable across renders.
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Platform admin access required.</p>
          <Link to={createPageUrl('ClubSelector')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Club Selection</Button>
          </Link>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('PlatformAdmin')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Club Analytics</h1>
              <p className="text-xs text-gray-500 mt-0.5">Per-club engagement, growth and activity trends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Club selector */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Select a club</label>
                {clubsLoading ? <Skeleton className="h-9 w-full sm:w-80" /> : (
                  <ClubSearchSelect
                    clubs={clubs}
                    value={clubId}
                    onValueChange={(id) => {
                      setShowAllTime(false);
                      setSearchParams(id ? { clubId: id } : {}, { replace: true });
                    }}
                    placeholder="Select a club to view analytics"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!clubId && (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Select a club above to view its analytics.</p>
          </div>
        )}

        {clubId && isError && (
          <Card className="shadow-sm border-red-200">
            <CardContent className="p-6 text-center text-red-600">Failed to load analytics. Please try again.</CardContent>
          </Card>
        )}

        {clubId && !isError && !analytics && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
          </div>
        )}

        {clubId && !isError && analytics && (
          <>
            {/* Club summary strip */}
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                {selectedClub?.logo_url ? (
                  <img src={selectedClub.logo_url} alt={selectedClub.name} className="w-12 h-12 rounded-lg object-contain bg-white border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center"><Building2 className="w-6 h-6 text-cyan-600" /></div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{selectedClub?.name || 'Club'}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {selectedClub?.season && <Badge variant="secondary" className="capitalize">{selectedClub.season}</Badge>}
                    {selectedClub?.created_date && <span>Created {new Date(selectedClub.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {analytics.earliest_date && <span>· Data since {new Date(analytics.earliest_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Total Active Members" value={summary?.total_active_members ?? 0} accent="bg-emerald-50 text-emerald-600" />
              <KpiCard icon={Calendar} label="Total Bookings" value={summary?.total_bookings ?? 0} accent="bg-blue-50 text-blue-600" />
              <KpiCard icon={Mail} label="Total Emails Sent" value={summary?.total_emails_sent ?? 0} accent="bg-amber-50 text-amber-600" />
              <KpiCard icon={LogIn} label="Total Members Ever Logged In" value={summary?.total_distinct_logins ?? 0} accent="bg-purple-50 text-purple-600" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Granularity</span>
                <Select value={granularity} onValueChange={(v) => { setGranularity(v); setShowAllTime(false); }}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="day">Day</SelectItem></SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAllTime(s => !s)}>
                {showAllTime ? (granularity === 'month' ? 'Show last 12 months' : 'Show last 30 days') : 'Show all time since creation'}
              </Button>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Member Growth" data={chartData} dataKey="new_members" color="#10b981" type="line" />
              <ChartCard title="Bookings" data={chartData} dataKey="bookings" color="#3b82f6" type="bar" />
              <ChartCard title="Emails Sent" data={chartData} dataKey="emails_sent" color="#f59e0b" type="bar" />
              <ChartCard title="Member Logins" data={chartData} dataKey="logins" color="#8b5cf6" type="line" note={loginNote} />
            </div>

            {/* Additional Activity */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Additional Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Membership Status</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved: {summary?.membership_status_breakdown?.approved ?? 0}</Badge>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending: {summary?.membership_status_breakdown?.pending ?? 0}</Badge>
                      <Badge className="bg-red-100 text-red-700 border-red-200">Rejected: {summary?.membership_status_breakdown?.rejected ?? 0}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <SmallStat icon={MessageSquare} label="Messages" value={summary?.messages_total ?? 0} accent="bg-gray-100 text-gray-600" />
                    <SmallStat icon={Send} label="SMS (this month)" value={summary?.sms_sent_this_month ?? 0} accent="bg-blue-100 text-blue-600" />
                    <SmallStat icon={Send} label="SMS (all time)" value={summary?.sms_sent_all_time ?? 0} accent="bg-blue-100 text-blue-600" />
                    <SmallStat icon={Trophy} label="Comp. Entries" value={summary?.competition_entries_all_time ?? 0} accent="bg-amber-100 text-amber-600" sub={`${summary?.competition_entries_this_month ?? 0} this month`} />
                    <SmallStat icon={Layers} label="League Teams" value={summary?.league_teams_all_time ?? 0} accent="bg-purple-100 text-purple-600" sub={`${summary?.league_teams_this_month ?? 0} this month`} />
                    <SmallStat icon={ShieldCheck} label="Admin Actions" value={summary?.admin_actions_total ?? 0} accent="bg-red-100 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}