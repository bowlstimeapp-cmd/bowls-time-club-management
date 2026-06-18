import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, User, CheckCircle, XCircle, Clock, ArrowRight,
  Trophy, Users, Bell, MapPin, ChevronRight
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay, endOfDay, addWeeks } from 'date-fns';
import { toast } from 'sonner';

export default function MemberDashboard() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => (await base44.entities.Club.filter({ id: clubId }))[0],
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => (await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email }))[0],
    enabled: !!clubId && !!user?.email,
  });

  // Upcoming bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ['myUpcomingBookings', clubId, user?.email],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const all = await base44.entities.Booking.filter({ club_id: clubId, booker_email: user.email });
      return all
        .filter(b => b.date >= today && b.status !== 'cancelled' && b.status !== 'rejected')
        .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
        .slice(0, 5);
    },
    enabled: !!clubId && !!user?.email,
  });

  // Team selections the member is in
  const { data: allSelections = [] } = useQuery({
    queryKey: ['allSelections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' }),
    enabled: !!clubId,
  });

  // Member availability
  const { data: availabilities = [] } = useQuery({
    queryKey: ['myAvailabilities', clubId, user?.email],
    queryFn: () => base44.entities.MemberAvailability.filter({ club_id: clubId, member_email: user.email }),
    enabled: !!clubId && !!user?.email,
  });

  // League teams & fixtures
  const { data: leagueTeams = [] } = useQuery({
    queryKey: ['myLeagueTeams', clubId, user?.email],
    queryFn: async () => {
      const all = await base44.entities.LeagueTeam.filter({ club_id: clubId });
      return all.filter(t => t.players && t.players.includes(user.email));
    },
    enabled: !!clubId && !!user?.email,
  });

  const myTeamIds = leagueTeams.map(t => t.id);

  const { data: leagueFixtures = [] } = useQuery({
    queryKey: ['myLeagueFixtures', clubId, myTeamIds],
    queryFn: async () => {
      if (myTeamIds.length === 0) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const all = await base44.entities.LeagueFixture.filter({ club_id: clubId });
      return all
        .filter(f =>
          f.match_date >= today &&
          f.status !== 'cancelled' &&
          (myTeamIds.includes(f.home_team_id) || myTeamIds.includes(f.away_team_id))
        )
        .sort((a, b) => a.match_date.localeCompare(b.match_date));
    },
    enabled: !!clubId && myTeamIds.length > 0,
  });

  // Club tournaments where user is a participant
  const { data: tournaments = [] } = useQuery({
    queryKey: ['myTournaments', clubId, user?.email],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId, status: 'published' }),
    enabled: !!clubId && !!user?.email,
  });

  // Notifications (unread)
  const { data: notifications = [] } = useQuery({
    queryKey: ['myNotifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }),
    enabled: !!user?.email,
  });

  // ── Availability mutation ──────────────────────────────────────────────────
  const availabilityMutation = useMutation({
    mutationFn: async ({ selectionId, status }) => {
      const existing = availabilities.find(a => a.selection_id === selectionId);
      if (existing) {
        return base44.entities.MemberAvailability.update(existing.id, { status });
      }
      return base44.entities.MemberAvailability.create({
        club_id: clubId,
        selection_id: selectionId,
        member_email: user.email,
        member_name: membership?.user_name || user.full_name,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvailabilities', clubId, user?.email] });
      toast.success('Availability updated');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const today = startOfDay(new Date());

  // Selections where this member is included
  const mySelections = allSelections.filter(sel => {
    if (!sel.selections || !sel.match_date) return false;
    if (sel.match_date < format(today, 'yyyy-MM-dd')) return false;
    const allPositions = Object.values(sel.selections);
    return allPositions.includes(user?.email);
  }).sort((a, b) => a.match_date.localeCompare(b.match_date));

  const getAvailabilityForSelection = (selectionId) =>
    availabilities.find(a => a.selection_id === selectionId);

  // Active tournament matches for this user
  const myTournamentMatches = [];
  if (user?.email) {
    tournaments.forEach(t => {
      if (t.tournament_type === 'knockout' && t.bracket) {
        const processRound = (rounds) => {
          Object.entries(rounds || {}).forEach(([roundName, matches]) => {
            (matches || []).forEach(match => {
              if (!match || match.winner_id) return;
              const participants = [
                ...(Array.isArray(match.player1) ? match.player1 : [match.player1]),
                ...(Array.isArray(match.player2) ? match.player2 : [match.player2]),
              ].filter(Boolean);
              if (participants.includes(user.email)) {
                myTournamentMatches.push({
                  tournament: t,
                  round: roundName,
                  match,
                  opponent: participants.filter(p => p !== user.email),
                });
              }
            });
          });
        };
        processRound(t.bracket?.rounds || t.bracket);
      }
    });
  }

  // Notifications summary items
  const notifItems = [];
  const unreadCount = notifications.length;
  if (unreadCount > 0) {
    notifItems.push({ text: `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`, type: 'notification' });
  }
  // Selections needing availability response
  const pendingSelections = mySelections.filter(sel => !getAvailabilityForSelection(sel.id));
  if (pendingSelections.length > 0) {
    notifItems.push({ text: `You have ${pendingSelections.length} match selection${pendingSelections.length > 1 ? 's' : ''} awaiting your availability`, type: 'selection' });
  }
  // Upcoming bookings this week
  const weekEnd = format(addDays(today, 7), 'yyyy-MM-dd');
  const bookingsThisWeek = bookings.filter(b => b.date <= weekEnd);
  if (bookingsThisWeek.length > 0) {
    notifItems.push({ text: `You have ${bookingsThisWeek.length} upcoming booking${bookingsThisWeek.length > 1 ? 's' : ''} this week`, type: 'booking' });
  }
  // League fixtures in next 14 days
  const twoWeeksEnd = format(addDays(today, 14), 'yyyy-MM-dd');
  const upcomingFixtures = leagueFixtures.filter(f => f.match_date <= twoWeeksEnd);
  if (upcomingFixtures.length > 0) {
    notifItems.push({ text: `You have ${upcomingFixtures.length} league fixture${upcomingFixtures.length > 1 ? 's' : ''} in the next 14 days`, type: 'fixture' });
  }

  const memberFirstName = user?.first_name || user?.full_name?.split(' ')[0] || 'Member';

  if (!user || !club) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Welcome Header ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
          <p className="text-emerald-100 text-sm mb-1">{club?.name}</p>
          <h1 className="text-2xl font-bold">Welcome back, {memberFirstName} 👋</h1>
          <p className="text-emerald-100 text-sm mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>

        {/* ── Notifications Summary ────────────────────────────────────────── */}
        {notifItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Action Required</span>
              </div>
              <ul className="space-y-2">
                {notifItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="w-full h-16 text-base bg-emerald-600 hover:bg-emerald-700 flex-col gap-1">
              <Calendar className="w-5 h-5" />
              Book a Rink
            </Button>
          </Link>
          <Link to={createPageUrl('Profile') + `?clubId=${clubId}`}>
            <Button variant="outline" className="w-full h-16 text-base flex-col gap-1 border-2">
              <User className="w-5 h-5" />
              My Profile
            </Button>
          </Link>
        </div>

        {/* ── Selected Matches & Availability ─────────────────────────────── */}
        {mySelections.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Your Selected Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {mySelections.map(sel => {
                  const avail = getAvailabilityForSelection(sel.id);
                  const status = avail?.status;
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
                        <AvailabilityBadge status={status} />
                      </div>
                      {!status && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                            onClick={() => availabilityMutation.mutate({ selectionId: sel.id, status: 'available' })}
                            disabled={availabilityMutation.isPending}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Available
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => availabilityMutation.mutate({ selectionId: sel.id, status: 'unavailable' })}
                            disabled={availabilityMutation.isPending}
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

        {/* ── Upcoming Bookings ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm text-gray-500 mb-3">You have no upcoming bookings.</p>
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

        {/* ── Competition Matches ───────────────────────────────────────────── */}
        {myTournamentMatches.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                Competition Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {myTournamentMatches.map((item, i) => (
                  <div key={i} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.tournament.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.round}</p>
                      {item.opponent.length > 0 && (
                        <p className="text-xs text-gray-600 mt-0.5">vs {item.opponent.join(', ')}</p>
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
            </CardContent>
          </Card>
        )}

        {/* ── League Fixtures ───────────────────────────────────────────────── */}
        {leagueFixtures.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                League Fixtures
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {leagueFixtures.map(fixture => {
                  const myTeam = leagueTeams.find(t => t.id === fixture.home_team_id || t.id === fixture.away_team_id);
                  const isHome = myTeam?.id === fixture.home_team_id;
                  return (
                    <div key={fixture.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{myTeam?.name}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                          {' · '}
                          <span className={isHome ? 'text-emerald-600 font-medium' : 'text-blue-600 font-medium'}>
                            {isHome ? 'Home' : 'Away'}
                          </span>
                        </p>
                      </div>
                      <Link to={createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`}>
                        <Button size="sm" variant="ghost" className="shrink-0 text-xs h-8 text-emerald-700">
                          View <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t">
                <Link to={createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
                    View Team Fixtures <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function AvailabilityBadge({ status }) {
  if (status === 'available') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">Available</Badge>;
  if (status === 'unavailable') return <Badge className="bg-red-100 text-red-800 border-red-200 shrink-0">Not Available</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 shrink-0">Awaiting</Badge>;
}

function BookingStatusBadge({ status }) {
  if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Confirmed</Badge>;
  if (status === 'pending') return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}