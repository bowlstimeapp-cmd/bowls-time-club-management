import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, addDays } from 'date-fns';
import { CheckCircle, XCircle, Loader2, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const generateTimeSlots = (openingTime = '10:00', closingTime = '21:00', duration = 2) => {
  const slots = [];
  const [openHour] = openingTime.split(':').map(Number);
  const [closeHour] = closingTime.split(':').map(Number);
  for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
    const endHour = hour + duration;
    const fmt = (h) => h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    slots.push({
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(endHour).padStart(2, '0')}:00`,
      label: `${fmt(hour)} - ${fmt(endHour)}`,
    });
  }
  return slots;
};

const STATUS_STYLES = {
  approved: 'bg-emerald-500 text-white border-emerald-600',
  pending:  'bg-amber-100 text-amber-900 border-amber-300',
  rejected: 'bg-gray-100 text-gray-400 border-gray-200',
  cancelled:'bg-gray-100 text-gray-400 border-gray-200',
};

export default function RinkDisplayTV() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = searchParams.get('clubId');

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 1 = tomorrow
  const [progress, setProgress] = useState(0);

  // Auth check
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setAuthChecked(true);
    });
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
      const memberships = await base44.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const cycleDuration = (club?.tv_display_cycle_seconds || 30) * 1000;

  const displayDate = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
  const displayDateLabel = dayOffset === 0
    ? `Today — ${format(addDays(new Date(), 0), 'EEEE d MMMM yyyy')}`
    : `Tomorrow — ${format(addDays(new Date(), 1), 'EEEE d MMMM yyyy')}`;

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['tv-bookings', clubId, displayDate],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, date: displayDate }),
    enabled: !!clubId,
    refetchInterval: 30000,
  });

  // Cycle between today and tomorrow
  useEffect(() => {
    if (!club) return;
    const duration = (club.tv_display_cycle_seconds || 30) * 1000;
    const interval = 50; // ms between progress ticks
    let elapsed = 0;

    const tick = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        elapsed = 0;
        setDayOffset(prev => (prev === 0 ? 1 : 0));
        setProgress(0);
      }
    }, interval);

    return () => clearInterval(tick);
  }, [club]);

  if (!clubId) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">No club selected.</div>;
  }

  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (authChecked && (!user || !isClubAdmin)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-center p-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">This display is only available to club admins.</p>
        </div>
      </div>
    );
  }

  const TIME_SLOTS = generateTimeSlots(club?.opening_time, club?.closing_time, club?.session_duration);
  const RINKS = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);

  const getBooking = (rink, startTime) =>
    bookings.find(b => b.rink_number === rink && b.start_time === startTime && b.status !== 'cancelled' && b.status !== 'rejected');

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          {club?.logo_url && (
            <img src={club.logo_url} alt={club.name} className="h-12 w-12 object-contain rounded-lg bg-white p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{club?.name}</h1>
            <p className="text-emerald-400 font-semibold text-lg">{displayDateLabel}</p>
          </div>
        </div>

        {/* Live clock */}
        <LiveClock />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 shrink-0">
        <div
          className="h-full bg-emerald-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="min-w-0">
          {/* Rink header row */}
          <div
            className="grid gap-3 mb-3"
            style={{ gridTemplateColumns: `140px repeat(${RINKS.length}, 1fr)` }}
          >
            <div className="flex items-center gap-2 text-gray-400 text-sm font-medium px-2">
              <Clock className="w-4 h-4" />
              Time
            </div>
            {RINKS.map(rink => (
              <div key={rink} className="text-center py-2 bg-gray-800 rounded-lg">
                <span className="text-base font-bold text-gray-100">Rink {rink}</span>
              </div>
            ))}
          </div>

          {/* Slot rows */}
          <div className="space-y-3">
            {TIME_SLOTS.map(slot => (
              <div
                key={slot.start}
                className="grid gap-3"
                style={{ gridTemplateColumns: `140px repeat(${RINKS.length}, 1fr)` }}
              >
                <div className="flex items-center px-2 text-sm font-semibold text-gray-300">
                  {slot.label}
                </div>
                {RINKS.map(rink => {
                  const booking = getBooking(rink, slot.start);
                  const isRollup = booking?.competition_type === 'Roll-up';
                  const rollupCount = (booking?.rollup_members?.length || 0) + 1;

                  return (
                    <div
                      key={rink}
                      className={cn(
                        'rounded-xl border-2 px-3 py-3 min-h-[72px] flex flex-col justify-center',
                        booking
                          ? STATUS_STYLES[booking.status] || 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-gray-800 border-gray-700 text-gray-500'
                      )}
                    >
                      {booking ? (
                        <>
                          <span className="font-bold text-sm leading-tight truncate">
                            {booking.booker_name}
                          </span>
                          {booking.competition_type && (
                            <span className="text-xs opacity-80 truncate mt-0.5">
                              {booking.competition_type === 'Other' && booking.competition_other
                                ? booking.competition_other
                                : booking.competition_type}
                            </span>
                          )}
                          {isRollup && (
                            <span className="text-xs font-semibold flex items-center gap-1 mt-1 opacity-90">
                              <Users className="w-3 h-3" />
                              {rollupCount}/8
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-medium text-center w-full">Available</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Approved</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-amber-200" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-gray-700" /> Available</span>
        </div>
        <span className="text-xs text-gray-600">
          Cycling every {club?.tv_display_cycle_seconds || 30}s
        </span>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-3xl font-mono font-bold text-white">
        {format(now, 'HH:mm:ss')}
      </p>
      <p className="text-sm text-gray-400">{format(now, 'EEEE d MMMM yyyy')}</p>
    </div>
  );
}