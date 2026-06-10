/**
 * Senior Fixtures page – card-based, grouped by Today / This Week / Future
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SeniorLayout from '@/components/senior/SeniorLayout';
import { format, parseISO, isToday, isThisWeek, isFuture, startOfToday } from 'date-fns';
import { Loader2, ChevronRight, CheckCircle2, Clock, Calendar } from 'lucide-react';

function FixtureCard({ selection, clubId, userEmail }) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selection.selections && Object.values(selection.selections).includes(userEmail);
  const dateObj = parseISO(selection.match_date);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-xl font-bold text-gray-900">{selection.competition}</p>
            {selection.match_name && <p className="text-base text-gray-600">{selection.match_name}</p>}
          </div>
          {isSelected && (
            <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm shrink-0">
              <CheckCircle2 className="w-4 h-4" /> Selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-base text-gray-700 mb-4">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400" />{format(dateObj, 'EEEE, d MMMM yyyy')}</span>
          {selection.match_start_time && (
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" />{selection.match_start_time}</span>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full bg-[#1F3C5A] hover:bg-[#16304a] text-white font-bold text-base py-3 px-4 rounded-xl min-h-[52px] flex items-center justify-between transition-colors"
        >
          {expanded ? 'Hide Details' : 'View Details'}
          <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="border-t-2 border-gray-100 bg-gray-50 p-5">
          {isSelected ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
              <p className="text-emerald-800 font-bold text-base">✅ You have been selected for this match!</p>
            </div>
          ) : (
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-3">
              <p className="text-gray-700 font-medium text-base">You are not currently selected for this match.</p>
            </div>
          )}
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-2">Match Details</p>
          <div className="space-y-1 text-base text-gray-700">
            <p><span className="font-semibold">Competition:</span> {selection.competition}</p>
            <p><span className="font-semibold">Date:</span> {format(dateObj, 'EEEE, d MMMM yyyy')}</p>
            {selection.match_start_time && <p><span className="font-semibold">Start Time:</span> {selection.match_start_time}</p>}
            {selection.friendly_location && <p><span className="font-semibold">Venue:</span> {selection.friendly_location}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeniorFixtures() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const todayStr = format(startOfToday(), 'yyyy-MM-dd');

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ['seniorSelections', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, status: 'published' }, 'match_date'),
    enabled: !!clubId,
  });

  const upcoming = selections.filter(s => s.match_date >= todayStr);
  const todayFixtures = upcoming.filter(s => s.match_date === todayStr);
  const thisWeekFixtures = upcoming.filter(s => s.match_date > todayStr && isThisWeek(parseISO(s.match_date), { weekStartsOn: 1 }));
  const futureFixtures = upcoming.filter(s => !isToday(parseISO(s.match_date)) && !isThisWeek(parseISO(s.match_date), { weekStartsOn: 1 }));

  return (
    <SeniorLayout>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Fixtures</h1>
      <p className="text-lg text-gray-600 mb-6">Your club's upcoming matches</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-lg text-gray-600">Loading fixtures…</span>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">No upcoming fixtures at the moment.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {todayFixtures.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-emerald-700 mb-3 uppercase tracking-wide">Today</h2>
              <div className="space-y-4">
                {todayFixtures.map(s => <FixtureCard key={s.id} selection={s} clubId={clubId} userEmail={user?.email} />)}
              </div>
            </section>
          )}
          {thisWeekFixtures.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#1F3C5A] mb-3 uppercase tracking-wide">This Week</h2>
              <div className="space-y-4">
                {thisWeekFixtures.map(s => <FixtureCard key={s.id} selection={s} clubId={clubId} userEmail={user?.email} />)}
              </div>
            </section>
          )}
          {futureFixtures.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-600 mb-3 uppercase tracking-wide">Future Fixtures</h2>
              <div className="space-y-4">
                {futureFixtures.map(s => <FixtureCard key={s.id} selection={s} clubId={clubId} userEmail={user?.email} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </SeniorLayout>
  );
}