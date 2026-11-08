import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, Calendar, Clock, ChevronRight, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import FixtureInterestButton from '@/components/fixtures/FixtureInterestButton';
import useFixtureInterests from '@/hooks/useFixtureInterests';
import useClubCompetitions from '@/hooks/useClubCompetitions';

/** Upcoming club fixtures with the member's "I'm available" star. */
export default function UpcomingFixturesCard({ clubId, userEmail, dragging }) {
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const { data: fixtures = [], isLoading } = useQuery({
    queryKey: ['upcomingClubFixtures', clubId],
    queryFn: async () => {
      const all = await base44.entities.ClubFixture.filter({ club_id: clubId }, 'date', 200);
      return all.filter(f => f.date >= todayStr && f.broadcast === true).slice(0, 5);
    },
    enabled: !!clubId,
  });

  const { clubCompetitions: competitions } = useClubCompetitions(clubId);

  const { interests, canSeeAll, toggle } = useFixtureInterests(clubId);

  const signUpCounts = useMemo(() => {
    const counts = {};
    interests.forEach(i => { counts[i.fixture_id] = (counts[i.fixture_id] || 0) + 1; });
    return counts;
  }, [interests]);

  const competitionMap = useMemo(() => {
    const map = {};
    competitions.forEach(c => { map[c.id] = c; });
    return map;
  }, [competitions]);

  const myInterestIds = useMemo(
    () => new Set(interests.filter(i => i.user_email === userEmail).map(i => i.fixture_id)),
    [interests, userEmail]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {dragging && <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />}
          <CalendarDays className="w-4 h-4 text-emerald-600" />
          Fixture Sign-up
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : fixtures.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">No fixtures are open for sign-up right now.</div>
        ) : (
          <div className="divide-y">
            {fixtures.map(fixture => (
              <div key={fixture.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {competitionMap[fixture.competition_id]?.name || 'Fixture'}
                      {fixture.opponent ? <span className="text-gray-400"> vs </span> : null}
                      {fixture.opponent || ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(fixture.date), 'd MMM yyyy')}</span>
                      {fixture.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fixture.time}</span>}
                      <span>{fixture.venue}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <FixtureInterestButton
                      interested={myInterestIds.has(fixture.id)}
                      onToggle={() => toggle(fixture.id)}
                    />
                    {canSeeAll && (
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {signUpCounts[fixture.id] || 0} signed up
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 border-t">
          <Link to={createPageUrl('ClubFixtures') + `?clubId=${clubId}`}>
            <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:text-emerald-800 text-xs">
              View All Fixtures <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}