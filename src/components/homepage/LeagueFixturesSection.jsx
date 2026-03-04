import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import HomepageSection from './HomepageSection';

export default function LeagueFixturesSection({ fixtures, teams, leagues, userEmail }) {
  // Find the user's teams
  const myTeamIds = teams
    .filter(t => t.captain_email === userEmail || (t.players || []).includes(userEmail))
    .map(t => t.id);

  const today = new Date().toISOString().split('T')[0];
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get fixtures for my teams in the next 7 days
  const upcomingFixtures = fixtures
    .filter(f =>
      (myTeamIds.includes(f.home_team_id) || myTeamIds.includes(f.away_team_id)) &&
      f.match_date >= today &&
      f.match_date <= in7Days &&
      f.status !== 'cancelled'
    )
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  if (upcomingFixtures.length === 0) {
    return (
      <HomepageSection title="My League Fixtures This Week">
        <div className="text-center py-10 text-gray-400">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No league fixtures in the next 7 days</p>
        </div>
      </HomepageSection>
    );
  }

  return (
    <HomepageSection title="My League Fixtures This Week">
      <div className="space-y-3">
        {upcomingFixtures.map(fixture => {
          const homeTeam = teams.find(t => t.id === fixture.home_team_id);
          const awayTeam = teams.find(t => t.id === fixture.away_team_id);
          const league = leagues.find(l => l.id === fixture.league_id);
          const myTeam = teams.find(t => myTeamIds.includes(t.id) && (t.id === fixture.home_team_id || t.id === fixture.away_team_id));
          const isHome = myTeam?.id === fixture.home_team_id;
          const opponent = isHome ? awayTeam : homeTeam;
          const isToday = fixture.match_date === today;

          // Get rota players for this fixture
          const rotaPlayers = myTeam?.fixture_rota?.[fixture.id] || [];

          return (
            <Card key={fixture.id} className={`hover:shadow-sm transition-shadow ${isToday ? 'border-emerald-300 bg-emerald-50/40' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {myTeam?.name} vs {opponent?.name}
                      </p>
                      <Badge variant="outline" className="text-xs">{isHome ? 'Home' : 'Away'}</Badge>
                      {isToday && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Today</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(fixture.match_date), 'EEEE d MMMM')}
                      {fixture.rink_number && <span className="ml-1">· Rink {fixture.rink_number}</span>}
                    </p>
                    {league && (
                      <p className="text-xs text-gray-400 mt-0.5">{league.name}</p>
                    )}
                    {rotaPlayers.length > 0 && (
                      <p className="text-xs text-emerald-700 mt-1 font-medium">
                        Selected players: {rotaPlayers.length} assigned
                      </p>
                    )}
                  </div>
                  <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </HomepageSection>
  );
}