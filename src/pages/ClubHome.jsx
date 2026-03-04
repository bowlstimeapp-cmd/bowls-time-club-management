import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Search } from 'lucide-react';

import HomepageHero from '@/components/homepage/HomepageHero';
import HomepageSection from '@/components/homepage/HomepageSection';
import NewsSection from '@/components/homepage/NewsSection';
import MatchResultsSection from '@/components/homepage/MatchResultsSection';
import UpcomingMatchesSection from '@/components/homepage/UpcomingMatchesSection';
import GallerySection from '@/components/homepage/GallerySection';
import SocialEventsSection from '@/components/homepage/SocialEventsSection';
import MembersSection from '@/components/homepage/MembersSection';
import ExternalEmbedSection from '@/components/homepage/ExternalEmbedSection';
import LeagueFixturesSection from '@/components/homepage/LeagueFixturesSection';
import TodaysRinksSection from '@/components/homepage/TodaysRinksSection';

const DEFAULT_SECTIONS = [
  { id: 'news', label: 'News', visible: true, order: 1 },
  { id: 'match_results', label: 'Recent Match Results', visible: true, order: 2 },
  { id: 'upcoming_matches', label: 'Upcoming Matches & Selection', visible: true, order: 3 },
  { id: 'league_fixtures', label: 'My League Fixtures This Week', visible: true, order: 4 },
  { id: 'todays_rinks', label: "Today's Rink Availability", visible: true, order: 5 },
  { id: 'gallery', label: 'Gallery', visible: true, order: 6 },
  { id: 'social_events', label: 'Social Events', visible: true, order: 7 },
  { id: 'members', label: 'Club Members', visible: true, order: 8 },
  { id: 'external_embed', label: 'External Content', visible: false, order: 9 },
];

export default function ClubHome() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: homepage } = useQuery({
    queryKey: ['clubHomepage', clubId],
    queryFn: async () => {
      const results = await base44.entities.ClubHomepage.filter({ club_id: clubId });
      return results[0] || null;
    },
    enabled: !!clubId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['clubPosts', clubId],
    queryFn: () => base44.entities.ClubPost.filter({ club_id: clubId, is_published: true }, '-created_date', 20),
    enabled: !!clubId,
  });

  const { data: gallery = [] } = useQuery({
    queryKey: ['clubGallery', clubId],
    queryFn: () => base44.entities.ClubGalleryImage.filter({ club_id: clubId }, 'sort_order', 30),
    enabled: !!clubId,
  });

  const { data: selections = [] } = useQuery({
    queryKey: ['selections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' }, '-match_date', 10),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const { data: leagueTeams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagueFixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: todaysBookings = [] } = useQuery({
    queryKey: ['todaysBookings', clubId],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Booking.filter({ club_id: clubId, date: today });
    },
    enabled: !!clubId,
  });

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const sectionsConfig = homepage?.sections_config?.length
    ? homepage.sections_config
    : DEFAULT_SECTIONS;

  const visibleSections = [...sectionsConfig]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  const newsPosts = posts.filter(p => p.type === 'news');
  const matchResults = posts.filter(p => p.type === 'match_result');
  const socialEvents = posts.filter(p => p.type === 'social_event');

  const upcomingMatches = selections.filter(s => s.match_date >= new Date().toISOString().split('T')[0]);
  const pastMatches = selections.filter(s => s.match_date < new Date().toISOString().split('T')[0]);

  const renderSection = (section) => {
    switch (section.id) {
      case 'news':
        return <NewsSection key="news" posts={newsPosts} clubId={clubId} isAdmin={isAdmin} />;
      case 'match_results':
        return <MatchResultsSection key="match_results" posts={matchResults} clubId={clubId} isAdmin={isAdmin} />;
      case 'upcoming_matches':
        return <UpcomingMatchesSection key="upcoming_matches" selections={upcomingMatches} clubId={clubId} />;
      case 'league_fixtures':
        return user ? (
          <LeagueFixturesSection
            key="league_fixtures"
            fixtures={leagueFixtures}
            teams={leagueTeams}
            leagues={leagues}
            userEmail={user.email}
          />
        ) : null;
      case 'todays_rinks':
        return (
          <TodaysRinksSection
            key="todays_rinks"
            club={club}
            bookings={todaysBookings}
          />
        );
      case 'gallery':
        return <GallerySection key="gallery" images={gallery} clubId={clubId} isAdmin={isAdmin} />;
      case 'social_events':
        return <SocialEventsSection key="social_events" posts={socialEvents} clubId={clubId} isAdmin={isAdmin} />;
      case 'members':
        return <MembersSection key="members" members={members} />;
      case 'external_embed':
        return homepage?.external_html ? (
          <ExternalEmbedSection key="external_embed" title={homepage.external_html_title} html={homepage.external_html} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHero club={club} homepage={homepage} isAdmin={isAdmin} />

      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-amber-700 font-medium">You are viewing the club homepage as an admin.</p>
          <Link to={createPageUrl('ClubHomepageAdmin') + `?clubId=${clubId}`}>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Manage Homepage
            </Button>
          </Link>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {visibleSections.map(section => renderSection(section))}
      </div>
    </div>
  );
}