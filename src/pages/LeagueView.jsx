import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Users, 
  Loader2,
  UserCircle,
  Calendar,
  Clock,
  List
} from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';
import LeagueTableView from '@/components/leagues/LeagueTableView';

export default function LeagueView() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [fixturesDialogOpen, setFixturesDialogOpen] = useState(false);
  const [viewingLeague, setViewingLeague] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: fixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const viewFixtures = (league) => {
    setViewingLeague(league);
    setFixturesDialogOpen(true);
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  const formatLabels = {
    triples: 'Triples (3)',
    fours: 'Fours (4)',
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leagues</h1>
          <p className="text-gray-600">{club?.name} • View leagues and fixtures</p>
        </motion.div>

        {leaguesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : leagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues yet</h3>
              <p className="text-gray-500">No leagues have been created for this club</p>
            </CardContent>
          </Card>
        ) : club?.alt_view_leagues ? (
          <LeagueTableView leagues={leagues} teams={teams} fixtures={fixtures} club={club} clubId={clubId} />
        ) : (
          <div className="space-y-6">
            {leagues.map((league) => {
              const leagueTeams = teams.filter(t => t.league_id === league.id);
              return (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {league.name}
                              <Badge className={statusColors[league.status || 'draft']}>
                                {league.status || 'draft'}
                              </Badge>
                              {league.format && (
                                <Badge variant="outline">
                                  {formatLabels[league.format] || league.format}
                                </Badge>
                              )}
                            </CardTitle>
                            {league.description && (
                              <CardDescription>{league.description}</CardDescription>
                            )}
                            {league.start_date && league.end_date && (
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(league.start_date), 'd MMM')} - {format(parseISO(league.end_date), 'd MMM yyyy')}
                                </span>
                                {league.start_time && league.end_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {league.start_time} - {league.end_time}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {league.fixtures_generated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewFixtures(league)}
                          >
                            <List className="w-4 h-4 mr-1" />
                            Fixtures
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4" />
                        Teams ({leagueTeams.length})
                      </h4>
                      {leagueTeams.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No teams in this league yet</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {leagueTeams.map((team) => (
                            <div key={team.id} className="border rounded-lg p-3 bg-gray-50">
                              <h5 className="font-medium text-gray-900">{team.name}</h5>
                              {team.captain_email ? (
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                  <UserCircle className="w-4 h-4" />
                                  {team.captain_name || team.captain_email}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 mt-1">No captain assigned</p>
                              )}
                              {team.players?.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {team.players.length} player{team.players.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Fixtures Dialog */}
        <Dialog open={fixturesDialogOpen} onOpenChange={() => setFixturesDialogOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{viewingLeague?.name} - Fixtures</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingLeague && fixtures
                .filter(f => f.league_id === viewingLeague.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date))
                .map(fixture => {
                  const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                  const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                  return (
                    <div key={fixture.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 w-24">
                          {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{homeTeam?.name || 'Unknown'}</span>
                          <span className="text-gray-400">vs</span>
                          <span className="font-medium">{awayTeam?.name || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Rink {fixture.rink_number}</Badge>
                        {fixture.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {fixture.home_score} - {fixture.away_score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              {viewingLeague && fixtures.filter(f => f.league_id === viewingLeague.id).length === 0 && (
                <p className="text-center text-gray-500 py-4">No fixtures generated yet</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}