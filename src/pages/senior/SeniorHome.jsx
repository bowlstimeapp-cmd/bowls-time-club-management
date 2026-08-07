import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SeniorLayout from '@/components/senior/SeniorLayout';
import { Calendar, ClipboardList, Trophy, Users, ChevronRight, Loader2 } from 'lucide-react';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';

function SeniorCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function BigActionButton({ to, children, color = 'emerald' }) {
  const colours = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    navy:    'bg-[#1F3C5A] hover:bg-[#16304a] text-white',
    gold:    'bg-[#C8A24A] hover:bg-[#b88f38] text-white',
  };
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl font-bold text-lg min-h-[64px] transition-colors ${colours[color]}`}
    >
      <span>{children}</span>
      <ChevronRight className="w-6 h-6 shrink-0" />
    </Link>
  );
}

export default function SeniorHome() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return ms[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  // Upcoming bookings for this user
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['myUpcomingBookings', clubId, user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('listBookings', { clubId, booker_email: user.email });
      const all = res.data.bookings || [];
      return all
        .filter(b => b.date >= todayStr && b.status !== 'cancelled')
        .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
        .slice(0, 3);
    },
    enabled: !!clubId && !!user?.email,
  });

  // Upcoming selections for this user
  const { data: mySelections = [], isLoading: selectionsLoading } = useQuery({
    queryKey: ['mySelections', clubId, user?.email],
    queryFn: async () => {
      const all = await base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' });
      return all
        .filter(s => {
          if (s.match_date < todayStr) return false;
          const sels = s.selections || {};
          return Object.values(sels).includes(user.email);
        })
        .sort((a, b) => a.match_date.localeCompare(b.match_date))
        .slice(0, 2);
    },
    enabled: !!clubId && !!user?.email,
  });

  const name = user?.first_name || user?.full_name?.split(' ')[0] || 'there';

  return (
    <SeniorLayout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Hello, {name}! 👋</h1>
        <p className="text-lg text-gray-600 mt-1">{format(today, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* My Next Booking */}
      <SeniorCard className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          My Next Booking
        </h2>
        {bookingsLoading ? (
          <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
        ) : myBookings.length === 0 ? (
          <p className="text-gray-600 text-lg mb-3">You have no upcoming rink bookings.</p>
        ) : (
          <div className="mb-3 space-y-2">
            {myBookings.map(b => (
              <div key={b.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-lg font-bold text-emerald-800">Rink {b.rink_number}</p>
                <p className="text-base text-gray-700">
                  {format(parseISO(b.date), 'EEEE, d MMMM')} &bull; {b.start_time} – {b.end_time}
                </p>
                {b.competition_type && (
                  <p className="text-sm text-gray-500 mt-1">{b.competition_type}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <BigActionButton to={`/SeniorBookRink?clubId=${clubId}`} color="emerald">
          Book a Rink
        </BigActionButton>
      </SeniorCard>

      {/* My Next Match */}
      <SeniorCard className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#1F3C5A]" />
          My Next Match
        </h2>
        {selectionsLoading ? (
          <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
        ) : mySelections.length === 0 ? (
          <p className="text-gray-600 text-lg mb-3">You are not currently selected for any upcoming matches.</p>
        ) : (
          <div className="mb-3 space-y-2">
            {mySelections.map(s => (
              <div key={s.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-lg font-bold text-blue-900">{s.competition}</p>
                <p className="text-base text-gray-700">{format(parseISO(s.match_date), 'EEEE, d MMMM')}</p>
                {s.match_start_time && <p className="text-sm text-gray-500">Start: {s.match_start_time}</p>}
              </div>
            ))}
          </div>
        )}
        <BigActionButton to={`/SeniorFixtures?clubId=${clubId}`} color="navy">
          View Fixtures
        </BigActionButton>
      </SeniorCard>

      {/* Quick Actions */}
      <SeniorCard className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BigActionButton to={`/SeniorBookRink?clubId=${clubId}`} color="emerald">
            📅 Book a Rink
          </BigActionButton>
          <BigActionButton to={`/SeniorFixtures?clubId=${clubId}`} color="navy">
            📋 View Fixtures
          </BigActionButton>
          <BigActionButton to={`/SeniorMembers?clubId=${clubId}`} color="gold">
            👥 Find a Member
          </BigActionButton>
          <BigActionButton to={`/SeniorCompetitions?clubId=${clubId}`} color="navy">
            🏆 Competitions
          </BigActionButton>
        </div>
      </SeniorCard>
    </SeniorLayout>
  );
}