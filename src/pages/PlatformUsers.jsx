import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Users, Search, Building2, ShieldAlert, ArrowLeft, UserCheck, UsersRound } from 'lucide-react';

const roleBadge = (role) => {
  if (role === 'admin') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Admin</Badge>;
  if (role === 'selector') return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Selector</Badge>;
  if (role === 'live_scorer') return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Scorer</Badge>;
  return <Badge variant="secondary">Member</Badge>;
};

export default function PlatformUsers() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: clubs = [] } = useQuery({
    queryKey: ['allClubs'],
    queryFn: () => base44.entities.Club.list(),
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['allMemberships'],
    queryFn: () => base44.entities.ClubMembership.list(),
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Platform admin access required.</p>
          <Link to={createPageUrl('ClubSelector')}><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const clubMap = Object.fromEntries(clubs.map(c => [c.id, c]));

  // Group memberships by user email
  const userMap = {};
  for (const m of memberships) {
    if (!m.user_email) continue;
    if (!userMap[m.user_email]) {
      userMap[m.user_email] = {
        email: m.user_email,
        name: m.user_name || m.user_email,
        memberships: [],
      };
    }
    userMap[m.user_email].memberships.push(m);
  }

  const allUsers = Object.values(userMap).sort((a, b) => a.name.localeCompare(b.name));

  // Stats
  const totalUsers = allUsers.length;
  const multiClubUsers = allUsers.filter(u => u.memberships.length > 1).length;
  const approvedMemberships = memberships.filter(m => m.status === 'approved');

  const clubStats = clubs.map(club => {
    const count = approvedMemberships.filter(m => m.club_id === club.id).length;
    const pct = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0.0';
    return { club, count, pct };
  }).sort((a, b) => b.count - a.count);

  // Filter
  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to={createPageUrl('PlatformAdmin')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Platform Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Platform Users</h1>
          <p className="text-gray-600">All registered users and their club memberships</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100"><Users className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-bold">{totalUsers}</p><p className="text-sm text-gray-500">Total Users</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><UsersRound className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{multiClubUsers}</p><p className="text-sm text-gray-500">Multi-Club Members</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Building2 className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold">{clubs.length}</p><p className="text-sm text-gray-500">Clubs</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><UserCheck className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-2xl font-bold">{approvedMemberships.length}</p><p className="text-sm text-gray-500">Approved Memberships</p></div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Club breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="h-full">
              <CardHeader><CardTitle className="text-base">Users per Club</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : clubStats.map(({ club, count, pct }) => (
                  <div key={club.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 truncate pr-2">{club.name}</span>
                      <span className="text-gray-500 shrink-0">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* User list */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">All Users ({filtered.length})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    No users found
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map(u => (
                      <div key={u.email} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                          {u.memberships.length > 1 && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                              {u.memberships.length} clubs
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {u.memberships.map(m => {
                            const club = clubMap[m.club_id];
                            return (
                              <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-2.5 pr-1 py-0.5">
                                <span className="text-xs text-gray-700">{club?.name || 'Unknown Club'}</span>
                                <span className="text-xs">{roleBadge(m.role)}</span>
                                {m.status !== 'approved' && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">{m.status}</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}