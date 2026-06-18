import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, User, CheckCircle, XCircle, Clock,
  Trophy, Users, Bell, MapPin, ChevronRight, ArrowRight, Newspaper
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function MemberDashboard() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => (await base44.entities.Club.filter({ id: clubId }))[0],
    enabled: !!clubId,
  });

  // ── Data queries ───────────────────────────────────────────────────────

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['myUpcomingBookings', clubId, user?.email],
    queryFn: async () => {
      const all = await base44.entities.Booking.filter({ club_id: clubId, booker_email: user.email });
      return all
        .filter(b => b.date >= todayStr && b.status !== 'cancelled' && b.status !== 'rejected')
        .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
        .slice(0, 5);
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: allSelections = [], isLoading: selectionsLoading } = useQuery({
    queryKey: ['allSelections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' }),
    enabled: !!clubId,
  });

  const { data: myAvailabilities = [] } = useQuery({
    queryKey: ['myAvailabilities', clubId, user?.email],
    queryFn: () => base44.entities.MemberAvailability.filter({ club_id: clubId, user_email: user.email }),
    enabled: !!clubId && !!user?.email,
  });

  const { data: allLeagueTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ['myTournaments', clubId],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId, status: 'published' }),
    enabled: !!clubId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['myNotifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: clubNews = [] } = useQuery({
    queryKey: ['clubPosts', clubId],
    queryFn: async () => {
      const posts = await base44.entities.ClubPost.filter({ club_id: clubId, type: 'news' });
      return posts
        .filter(p => p.is_published !== false)
        .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
        .slice(0, 5);
    },
    enabled: !!clubId,
  });

  // ── Derived data — memoised to avoid query key instability ─────────────

  const myTeams = useMemo(() => {
    if (!user?.email) return [];
    return allLeagueTeams.filter(t => t.players && t.players.includes(user.email));
  }, [allLeagueTeams, user?.email]);

  const myTeamIdStr = useMemo(() => myTeams.map(t => t.id).join(','), [myTeams]);

  const { data: leagueFixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: ['myLeagueFixtures', clubId, myTeamIdStr],
    queryFn: async () => {
      const myTeamIds = myTeamIdStr.split(',').filter(Boolean);
      const all = await base44.entities.LeagueFixture.filter({ club_id: clubId });
      return all
        .filter(f =>
          f.match_date >= todayStr &&
          f.status !== 'cancelled' &&
          (myTeamIds.includes(f.home_team_id) || myTeamIds.includes(f.away_team_id))
        )
        .sort((a, b) => a.match_date.localeCompare(b.match_date));
    },
    enabled: !!clubId && !!myTeamIdStr,
  });

  const mySelections = useMemo(() => {
    if (!user?.email || !allSelections.length) return [];
    return allSelections
      .filter(sel => {
        if (!sel.selections || !sel.match_date) return false;
        if (sel.match_date < todayStr) return false;
        if (sel.is_archived) return false;
        return Object.values(sel.selections).includes(user.email);
      })
      .sort((a, b) => a.match_date.localeCompare(b.match_date));
  }, [allSelections, user?.email, todayStr]);

  const myTournamentMatches = useMemo(() => {
    if (!user?.email || !tournaments.length) return [];
    const matches = [];
    tournaments.forEach(t => {
      if (t.tournament_type === 'knockout' && t.bracket) {
        const rounds = t.bracket?.rounds || t.bracket;
        const totalRounds = Array.isArray(rounds) ? rounds.length : Object.keys(rounds || {}).length;
        const getRoundName = (idx, total) => {
          const remaining = total - idx;
          if (remaining === 1) return 'Final';
          if (remaining === 2) return 'Semi-Finals';
          if (remaining === 3) return 'Quarter-Finals';
          return `Round ${idx + 1}`;
        };
        Object.entries(rounds || {}).forEach(([roundKey, roundMatches]) => {
          const roundIndex = parseInt(roundKey);
          const roundName = isNaN(roundIndex) ? roundKey : getRoundName(roundIndex, totalRounds);
          const playByDate = t.bracket?.round_dates?.[roundName] || null;
          (roundMatches || []).forEach(match => {
            if (!match || match.winner_id) return;
            // Skip if a score has been entered
            if (match.player1_score != null || match.player2_score != null) return;
            const p1 = Array.isArray(match.player1) ? match.player1 : [match.player1];
            const p2 = Array.isArray(match.player2) ? match.player2 : [match.player2];
            const all = [...p1, ...p2].filter(Boolean);
            if (!all.includes(user.email)) return;
            const opponents = all.filter(p => p !== user.email);
            // Skip byes (no opponent assigned yet)
            if (opponents.length === 0) return;
            matches.push({
              tournamentName: t.name,
              round: roundName,
              opponents,
              playByDate,
            });
          });
        });
      }
    });
    return matches;
  }, [tournaments, user?.email]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const getMemberName = (email) => {
    const m = members.find(m => m.user_email === email);
    if (m?.first_name && m?.surname) return `${m.first_name} ${m.surname}`;
    return m?.user_name || email;
  };

  const getMyAvailability = (selectionId) => {
    const avail = myAvailabilities.find(a => a.selection_id === selectionId);
    return avail?.is_available;
  };

  // ── Availability mutation ──────────────────────────────────────────────

  const setAvailabilityMutation = useMutation({
    mutationFn: async ({ selectionId, isAvailable }) => {
      const existing = myAvailabilities.find(a => a.selection_id === selectionId);
      if (existing) {
        return base44.entities.MemberAvailability.update(existing.id, { is_available: isAvailable });
      }
      return base44.entities.MemberAvailability.create({
        club_id: clubId,
        selection_id: selectionId,
        user_email: user.email,
        is_available: isAvailable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvailabilities'] });
      toast.success('Availability updated');
    },
  });

  // ── Notifications banner items ─────────────────────────────────────────

  const notifItems = [];
  if (notifications.length > 0)
    notifItems.push(`${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}`);
  const pendingSelections = mySelections.filter(sel => getMyAvailability(sel.id) === undefined);
  if (pendingSelections.length > 0)
    notifItems.push(`${pendingSelections.length} match selection${pendingSelections.length > 1 ? 's' : ''} awaiting your availability`);
  if (myTournamentMatches.length > 0)
    notifItems.push(`${myTournamentMatches.length} outstanding competition match${myTournamentMatches.length > 1 ? 'es' : ''}`);
  const weekEnd = format(addDays(startOfDay(new Date()), 7), 'yyyy-MM-dd');
  const bookingsThisWeek = bookings.filter(b => b.date <= weekEnd);
  if (bookingsThisWeek.length > 0)
    notifItems.push(`${bookingsThisWeek.length} upcoming booking${bookingsThisWeek.length > 1 ? 's' : ''} this week`);

  const memberFirstName = user?.first_name || user?.full_name?.split(' ')[0] || 'Member';

  // ── Loading state ──────────────────────────────────────────────────────

  if (!user || !club) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
          <p className="text-emerald-100 text-sm mb-1">{club?.name}</p>
          <h1 className="text-2xl font-bold">Welcome back, {memberFirstName} 👋</h1>
          <p className="text-emerald-100 text-sm mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>

        {/* Notifications Banner */}
        {notifItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Action Required</span>
              </div>
              <ul className="space-y-1.5">
                {notifItems.map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="w-full h-16 text-sm bg-emerald-600 hover:bg-emerald-700 flex-col gap-1">
              <Calendar className="w-5 h-5" />
              Book a Rink
            </Button>
          </Link>
          <Link to={createPageUrl('Profile') + `?clubId=${clubId}`}>
            <Button variant="outline" className="w-full h-16 text-sm flex-col gap-1 border-2">
              <User className="w-5 h-5" />
              My Profile
            </Button>
          </Link>
        </div>

        {/* ── Selected Matches & Availability ── */}
        {club?.module_selection !== false && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                My Selected Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectionsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : mySelections.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400">
                  You have no upcoming match selections.
                </div>
              ) : (
                <div className="divide-y">
                  {mySelections.map(sel => {
                    const avail = getMyAvailability(sel.id);
                    return (
                      <div key={sel.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{sel.match_name || sel.competition}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(sel.match_date), 'd MMM yyyy')}
                              </span>
                              {sel.match_start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {sel.match_start_time}
                                </span>
                              )}
                              {sel.friendly_location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {sel.friendly_location}
                                </span>
                              )}
                            </div>
                          </div>
                          <AvailabilityBadge isAvailable={avail} />
                        </div>
                        {avail === undefined && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                              onClick={() => setAvailabilityMutation.mutate({ selectionId: sel.id, isAvailable: true })}
                              disabled={setAvailabilityMutation.isPending}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Available
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setAvailabilityMutation.mutate({ selectionId: sel.id, isAvailable: false })}
                              disabled={setAvailabilityMutation.isPending}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Not Available
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="p-3 border-t">
                <Link to={createPageUrl('Selection') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
                    View All Selections <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── League Fixtures ── */}
        {club?.module_leagues !== false && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                My League Fixtures
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(teamsLoading || fixturesLoading) ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : myTeams.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400">
                  You are not currently assigned to a league team.
                </div>
              ) : leagueFixtures.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400">
                  No upcoming league fixtures for your teams.
                </div>
              ) : (
                <div className="divide-y">
                  {leagueFixtures.map(fixture => {
                    const myTeam = myTeams.find(t => t.id === fixture.home_team_id || t.id === fixture.away_team_id);
                    const isHome = myTeam?.id === fixture.home_team_id;
                    const opponentTeamId = isHome ? fixture.away_team_id : fixture.home_team_id;
                    const opponentTeam = allLeagueTeams.find(t => t.id === opponentTeamId);
                    const league = leagues.find(l => l.id === myTeam?.league_id);
                    return (
                      <div key={fixture.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {myTeam?.name} <span className="text-gray-400">vs</span> {opponentTeam?.name || 'TBD'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                              </span>
                              <Badge className={`text-xs px-1.5 py-0 ${isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isHome ? 'Home' : 'Away'}
                              </Badge>
                              {fixture.rink_number && <span>Rink {fixture.rink_number}</span>}
                              {league && <span className="text-gray-400">{league.name}</span>}
                            </div>
                          </div>
                          <Link to={createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`}>
                            <Button size="sm" variant="ghost" className="shrink-0 text-xs h-8 text-emerald-700">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="p-3 border-t">
                <Link to={createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
                    View My Teams <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Competition Matches ── */}
        {club?.module_competitions !== false && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                Competition Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tournamentsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : myTournamentMatches.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400">
                  No outstanding competition matches.
                </div>
              ) : (
                <div className="divide-y">
                  {myTournamentMatches.map((item, i) => (
                    <div key={i} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{item.tournamentName}</p>
                        {item.round && <p className="text-xs text-gray-500 mt-0.5">{item.round}</p>}
                        <p className="text-xs text-gray-700 mt-1">
                          vs {item.opponents.map(o => getMemberName(o)).join(', ')}
                        </p>
                        {item.playByDate && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Play by {format(parseISO(item.playByDate), 'd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <Link to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}>
                        <Button size="sm" variant="outline" className="shrink-0 text-xs h-8">
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 border-t">
                <Link to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
                    View All Competitions <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Club News ── */}
        {clubNews.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-emerald-600" />
                Club News
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {clubNews.map(post => (
                  <div key={post.id} className="p-4">
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
                    )}
                    <p className="font-semibold text-sm text-gray-900">{post.title}</p>
                    {post.content && (
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{post.content}</p>
                    )}
                    {post.created_date && (
                      <p className="text-xs text-gray-400 mt-2">{format(parseISO(post.created_date), 'd MMM yyyy')}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Upcoming Bookings ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bookingsLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm text-gray-400 mb-3">You have no upcoming bookings.</p>
                <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book a Rink
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {bookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-sm text-gray-900">Rink {booking.rink_number}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(booking.date), 'd MMM yyyy')} · {booking.start_time} – {booking.end_time}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t">
                  <Link to={createPageUrl('MyBookings') + `?clubId=${clubId}`}>
                    <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
                      View All Bookings <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function AvailabilityBadge({ isAvailable }) {
  if (isAvailable === true) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0 text-xs">Available</Badge>;
  if (isAvailable === false) return <Badge className="bg-red-100 text-red-800 border-red-200 shrink-0 text-xs">Not Available</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 shrink-0 text-xs">Awaiting</Badge>;
}

function BookingStatusBadge({ status }) {
  if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Confirmed</Badge>;
  if (status === 'pending') return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}