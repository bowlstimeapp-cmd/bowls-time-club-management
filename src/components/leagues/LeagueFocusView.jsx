import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateLeagueTable } from '@/lib/leagueScoring';
import LeagueStandingsTable from '@/components/leagues/LeagueStandingsTable';

/**
 * Single-league focus view: the detail sections shown under the league card
 * when a Club Admin focuses on one league in League Admin.
 *
 * Props:
 *   league      – the focused League record
 *   teams       – all LeagueTeam records for the club
 *   fixtures    – all LeagueFixture records for the club
 *   onScoreEdit – (fixture) => void, opens the existing score entry dialog
 */
export default function LeagueFocusView({ league, teams = [], fixtures = [], onScoreEdit }) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const leagueTeams = teams.filter(t => t.league_id === league.id);
  const leagueFixtures = fixtures.filter(f => f.league_id === league.id);

  // Compare as yyyy-MM-dd strings so timezone handling can't go wrong
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const overdueFixtures = leagueFixtures
    .filter(f =>
      f.match_date < todayStr &&
      f.status !== 'completed' &&
      f.status !== 'cancelled' &&
      f.home_score == null &&
      f.away_score == null
    )
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  const upcomingFixtures = leagueFixtures
    .filter(f => f.match_date >= todayStr && f.status === 'scheduled')
    .sort((a, b) => {
      const dateCmp = a.match_date.localeCompare(b.match_date);
      if (dateCmp !== 0) return dateCmp;
      if (a.tie_id && b.tie_id) {
        const tieCmp = a.tie_id.localeCompare(b.tie_id);
        if (tieCmp !== 0) return tieCmp;
        return (a.leg || 1) - (b.leg || 1);
      }
      return 0;
    });

  const renderFixtureRow = (fixture, showPending) => {
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
          {league?.is_double_rink && fixture.tie_id && (
            <Badge variant="outline" className="bg-blue-50 text-blue-600">Leg {fixture.leg || 1}</Badge>
          )}
          {showPending && fixture.pending_home_score != null && (
            <Badge className="bg-amber-100 text-amber-800">Score pending approval</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onScoreEdit(fixture)}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {overdueFixtures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Overdue fixtures ({overdueFixtures.length})</CardTitle>
            <CardDescription>Fixtures from earlier dates with no score entered yet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueFixtures.map(f => renderFixtureRow(f, true))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>League table</CardTitle>
        </CardHeader>
        <CardContent>
          {leagueTeams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No teams yet</p>
          ) : (
            <LeagueStandingsTable
              table={calculateLeagueTable(league, leagueTeams, leagueFixtures)}
              league={league}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming fixtures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingFixtures.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No upcoming fixtures</p>
          ) : (
            <>
              {upcomingFixtures.slice(0, showAllUpcoming ? undefined : 10).map(f => renderFixtureRow(f, false))}
              {!showAllUpcoming && upcomingFixtures.length > 10 && (
                <Button variant="outline" size="sm" onClick={() => setShowAllUpcoming(true)}>
                  Show all upcoming ({upcomingFixtures.length})
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}