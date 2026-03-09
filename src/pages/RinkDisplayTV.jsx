import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, addDays } from 'date-fns';
import { Loader2, Users, Clock, Maximize2, Minimize2 } from 'lucide-react';
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
  pending:  'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-gray-100 text-gray-500 border-gray-300',
  cancelled:'bg-gray-100 text-gray-500 border-gray-300',
};

export default function RinkDisplayTV() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubId = searchParams.get('clubId');

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-900">No club selected.</div>;
  }

  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  if (authChecked && (!user || !isClubAdmin)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-center p-8">
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Access Denied</h1>
          <p className="text-gray-500">This display is only available to club admins.</p>
        </div>
      </div>
    );
  }

  const TIME_SLOTS = generateTimeSlots(club?.opening_time, club?.closing_time, club?.session_duration);
  const RINKS = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);

  const getBooking = (rink, startTime) =>
    bookings.find(b => b.rink_number === rink && b.start_time === startTime && b.status !== 'cancelled' && b.status !== 'rejected');

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          {club?.logo_url && (
            <img src={club.logo_url} alt={club.name} className="h-12 w-12 object-contain rounded-lg border p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{club?.name}</h1>
            <p className="text-emerald-600 font-semibold text-lg">{displayDateLabel}</p>
          </div>
        </div>

        {/* Live clock */}
        <LiveClock />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 shrink-0">
        <div
          className="h-full bg-emerald-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Grid */}
      <div className={cn("flex-1 p-6", isFullscreen ? "overflow-hidden flex flex-col" : "overflow-auto")}>
        <div className={cn("min-w-0", isFullscreen && "flex flex-col flex-1 h-full")}>
          {/* Rink header row */}
          <div
            className="grid gap-2 mb-3 shrink-0"
            style={{ gridTemplateColumns: `140px repeat(${RINKS.length}, 1fr)` }}
          >
            <div className="flex items-center gap-2 text-gray-500 font-medium px-2" style={{ fontSize: isFullscreen ? '1rem' : '0.875rem' }}>
              <Clock className="w-4 h-4" />
              Time
            </div>
            {RINKS.map(rink => (
              <div key={rink} className="text-center py-2">
                <span className="font-semibold text-gray-700" style={{ fontSize: isFullscreen ? '1.1rem' : '0.875rem' }}>Rink {rink}</span>
              </div>
            ))}
          </div>

          {/* Slot rows */}
          <div className={cn("gap-2", isFullscreen ? "flex flex-col flex-1" : "space-y-2")}>
            {TIME_SLOTS.map(slot => {
              return (
                <div
                  key={slot.start}
                  className={cn("grid gap-2", isFullscreen && "flex-1")}
                  style={{ gridTemplateColumns: `140px repeat(${RINKS.length}, 1fr)` }}
                >
                  <div className="flex items-center px-2 font-medium text-gray-600" style={{ fontSize: isFullscreen ? '1rem' : '0.875rem' }}>
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
                          'rounded-xl border-2 px-3 flex flex-col justify-center',
                          isFullscreen ? 'py-0 h-full' : 'py-3 min-h-[72px]',
                          booking
                            ? STATUS_STYLES[booking.status] || 'bg-emerald-500 text-white border-emerald-600'
                            : 'bg-white border-emerald-200 text-emerald-600'
                        )}
                      >
                        {booking ? (
                          <>
                            <span className="font-bold leading-tight" style={{ fontSize: isFullscreen ? '1.1rem' : '0.875rem' }}>
                              {booking.booker_name}
                            </span>
                            {booking.competition_type && (
                              <span className="opacity-80 mt-0.5" style={{ fontSize: isFullscreen ? '0.95rem' : '0.75rem' }}>
                                {booking.competition_type === 'Other' && booking.competition_other
                                  ? booking.competition_other
                                  : booking.competition_type}
                              </span>
                            )}
                            {booking.booking_format && isFullscreen && (
                              <span className="opacity-75 mt-0.5" style={{ fontSize: '0.9rem' }}>
                                {booking.booking_format}
                              </span>
                            )}
                            {booking.notes && isFullscreen && (
                              <span className="opacity-70 mt-0.5 line-clamp-2" style={{ fontSize: '0.85rem' }}>
                                {booking.notes}
                              </span>
                            )}
                            {isRollup && (
                              <span className="font-semibold flex items-center gap-1 mt-1 opacity-90" style={{ fontSize: isFullscreen ? '0.95rem' : '0.75rem' }}>
                                <Users className="w-3.5 h-3.5" />
                                {rollupCount}/8
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-medium text-center w-full" style={{ fontSize: isFullscreen ? '1rem' : '0.75rem' }}>Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Approved</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-300" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-white border border-emerald-200" /> Available</span>
        </div>
        <span className="text-xs text-gray-400">
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
      <p className="text-3xl font-mono font-bold text-gray-900">
        {format(now, 'HH:mm:ss')}
      </p>
      <p className="text-sm text-gray-500">{format(now, 'EEEE d MMMM yyyy')}</p>
    </div>
  );
}