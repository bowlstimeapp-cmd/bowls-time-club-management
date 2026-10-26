import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGreenTypes, getRinkConfig, getBookingGreen, GREEN_LABELS } from '@/lib/rinkConfig';
import RinkDisplayGrid from '@/components/booking/RinkDisplayGrid';

const generateTimeSlots = (openingTime = '10:00', closingTime = '21:00', duration = 2) => {
  const slots = [];
  const [openHour, openMin = 0] = openingTime.split(':').map(Number);
  const [closeHour, closeMin = 0] = closingTime.split(':').map(Number);
  const openMins = openHour * 60 + openMin;
  const closeMins = closeHour * 60 + closeMin;
  const durationMins = duration * 60;
  let cur = openMins;
  while (cur + durationMins <= closeMins) {
    const startH = Math.floor(cur / 60), startM = cur % 60;
    const endMins = cur + durationMins;
    const endH = Math.floor(endMins / 60), endM = endMins % 60;
    const fmt = (h, m) => {
      const ampm = h < 12 ? 'am' : 'pm';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
    };
    slots.push({
      start: `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`,
      end: `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`,
      label: `${fmt(startH, startM)} - ${fmt(endH, endM)}`,
    });
    cur += durationMins;
  }
  return slots;
};

const generateCustomSlots = (customSessions = []) => {
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
  };
  return customSessions.map(s => ({ start: s.start, end: s.end, label: `${fmt(s.start)} - ${fmt(s.end)}` }));
};

export default function RinkDisplayTV() {
  const [searchParams] = useSearchParams();
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

  const displayDate = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
  const displayDateLabel = dayOffset === 0
    ? `Today — ${format(addDays(new Date(), 0), 'EEEE d MMMM yyyy')}`
    : `Tomorrow — ${format(addDays(new Date(), 1), 'EEEE d MMMM yyyy')}`;

  const { data: bookings = [] } = useQuery({
    queryKey: ['tv-bookings', clubId, displayDate, user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('listBookings', { clubId, date: displayDate });
      return res.data.bookings || [];
    },
    enabled: !!clubId && !!user,
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

  // One section per green — dual-green clubs see the indoor and outdoor grids stacked
  const greenSections = getGreenTypes(club).map((green) => {
    const config = getRinkConfig(club, green);
    return {
      green,
      label: GREEN_LABELS[green],
      timeSlots: config.use_custom_sessions && config.custom_sessions?.length > 0
        ? generateCustomSlots(config.custom_sessions)
        : generateTimeSlots(config.opening_time, config.closing_time, config.session_duration),
      rinks: Array.from({ length: config.rink_count }, (_, i) => i + 1),
      bookings: bookings.filter((b) => getBookingGreen(b, club) === green),
    };
  });

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

      {/* Grids — one per green */}
      <div className={cn("flex-1 p-6", isFullscreen ? "overflow-hidden flex flex-col" : "overflow-auto")}>
        {greenSections.map((section, index) => (
          <div
            key={section.green}
            className={cn(index > 0 && "mt-8", isFullscreen && "flex flex-col flex-1 min-h-0")}
          >
            {greenSections.length > 1 && (
              <h2 className="text-xl font-bold text-emerald-700 mb-3">{section.label} Green</h2>
            )}
            <RinkDisplayGrid
              timeSlots={section.timeSlots}
              rinks={section.rinks}
              bookings={section.bookings}
              isFullscreen={isFullscreen}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Approved</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-300" /> Pending</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-white border border-emerald-200" /> Available</span>
          </div>
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