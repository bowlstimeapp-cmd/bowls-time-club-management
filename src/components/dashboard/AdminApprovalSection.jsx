import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, Calendar, Trophy, Table2, ChevronRight,
  AlertTriangle, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, startOfDay } from 'date-fns';

export default function AdminApprovalSection({ clubId, membership }) {
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const { data: pendingBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['adminPendingBookings', clubId],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, status: 'pending' }),
    enabled: !!clubId && isClubAdmin,
  });

  const { data: allTournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ['adminAllTournaments', clubId],
    queryFn: () => base44.entities.ClubTournament.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  const { data: allLeagueFixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: ['adminAllLeagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  const { data: leagueTeams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId && isClubAdmin,
  });

  // Tournament matches with scores entered but no winner confirmed
  const pendingTournamentResults = useMemo(() => {
    const results = [];
    allTournaments.forEach(t => {
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
          (roundMatches || []).forEach(match => {
            if (!match || match.winner_id) return;
            if (match.player1_score != null && match.player2_score != null) {
              results.push({
                tournamentName: t.name,
                round: roundName,
                p1: Array.isArray(match.player1) ? match.player1.join(' / ') : (match.player1 || 'TBD'),
                p2: Array.isArray(match.player2) ? match.player2.join(' / ') : (match.player2 || 'TBD'),
                s1: match.player1_score,
                s2: match.player2_score,
              });
            }
          });
        });
      }
      if (t.tournament_type === 'round_robin' && t.fixtures) {
        t.fixtures.forEach(fixture => {
          if (!fixture || fixture.winner_id) return;
          if (fixture.team1_score != null && fixture.team2_score != null) {
            const team1 = leagueTeams.find(tm => tm.id === fixture.team1_id);
            const team2 = leagueTeams.find(tm => tm.id === fixture.team2_id);
            results.push({
              tournamentName: t.name,
              round: null,
              p1: team1?.name || 'TBD',
              p2: team2?.name || 'TBD',
              s1: fixture.team1_score,
              s2: fixture.team2_score,
            });
          }
        });
      }
    });
    return results;
  }, [allTournaments, leagueTeams]);

  // League fixtures with score clashes or missing results
  const leagueIssues = useMemo(() => {
    const clashes = [];
    const missing = [];
    allLeagueFixtures.forEach(f => {
      if (f.conflict_first_team_id) {
        clashes.push(f);
      } else if (
        f.match_date < todayStr &&
        f.status === 'scheduled' &&
        f.pending_home_score == null &&
        f.home_score == null
      ) {
        missing.push(f);
      }
    });
    clashes.sort((a, b) => b.match_date.localeCompare(a.match_date));
    missing.sort((a, b) => b.match_date.localeCompare(a.match_date));
    return { clashes, missing };
  }, [allLeagueFixtures, todayStr]);

  if (!isClubAdmin) return null;

  const sortedPendingBookings = [...pendingBookings].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
  );

  const totalItems =
    sortedPendingBookings.length +
    pendingTournamentResults.length +
    leagueIssues.clashes.length +
    leagueIssues.missing.length;

  if (totalItems === 0) return null;

  const isLoading = bookingsLoading || tournamentsLoading || fixturesLoading;
  const getTeamName = (teamId) => leagueTeams.find(t => t.id === teamId)?.name || 'TBD';

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Admin Action Required
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 ml-1">{totalItems}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="divide-y">
            {/* Pending Bookings */}
            {sortedPendingBookings.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-sm text-gray-900">Pending Bookings</span>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{sortedPendingBookings.length}</Badge>
                </div>
                <div className="space-y-2">
                  {sortedPendingBookings.slice(0, 4).map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">Rink {b.rink_number}</span>
                        <span className="text-gray-500 ml-2">{format(parseISO(b.date), 'd MMM')} · {b.start_time}</span>
                      </div>
                      <span className="text-xs text-gray-500 truncate">{b.booker_name}</span>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl('AdminBookings') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-amber-700 hover:text-amber-800 text-xs">
                    Review Bookings <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Tournament Results */}
            {pendingTournamentResults.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-sm text-gray-900">Tournament Results</span>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{pendingTournamentResults.length}</Badge>
                </div>
                <div className="space-y-2">
                  {pendingTournamentResults.slice(0, 4).map((m, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-gray-900 truncate block">{m.tournamentName}</span>
                      <span className="text-xs text-gray-500">
                        {m.round ? `${m.round} · ` : ''}{m.p1} {m.s1}–{m.s2} {m.p2}
                      </span>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-amber-700 hover:text-amber-800 text-xs">
                    Review Tournaments <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {/* League Issues */}
            {(leagueIssues.clashes.length > 0 || leagueIssues.missing.length > 0) && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Table2 className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-sm text-gray-900">League Results</span>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    {leagueIssues.clashes.length + leagueIssues.missing.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {leagueIssues.clashes.slice(0, 3).map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">{getTeamName(f.home_team_id)} vs {getTeamName(f.away_team_id)}</span>
                        <span className="text-xs text-gray-500 ml-1">{format(parseISO(f.match_date), 'd MMM')}</span>
                      </div>
                    </div>
                  ))}
                  {leagueIssues.missing.slice(0, 3).map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">{getTeamName(f.home_team_id)} vs {getTeamName(f.away_team_id)}</span>
                        <span className="text-xs text-gray-500 ml-1">{format(parseISO(f.match_date), 'd MMM')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl('LeagueAdmin') + `?clubId=${clubId}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-amber-700 hover:text-amber-800 text-xs">
                    Review Leagues <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}