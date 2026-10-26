import React from 'react';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLeagueBooking, getLeagueBookingDisplay } from '@/lib/leagueBookingDisplay';

const STATUS_STYLES = {
  approved: 'bg-emerald-500 text-white border-emerald-600',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-gray-100 text-gray-500 border-gray-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

/** One green's rink-by-session grid for the TV display. */
export default function RinkDisplayGrid({ timeSlots = [], rinks = [], bookings = [], isFullscreen }) {
  const getBooking = (rink, startTime) =>
    bookings.find(
      (b) =>
        b.rink_number === rink &&
        b.start_time === startTime &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    );

  const gridStyle = { gridTemplateColumns: `140px repeat(${rinks.length}, 1fr)` };

  return (
    <div className={cn('min-w-0', isFullscreen && 'flex flex-col flex-1 h-full')}>
      {/* Rink header row */}
      <div className="grid gap-2 mb-3 shrink-0" style={gridStyle}>
        <div className="flex items-center gap-2 text-gray-500 font-medium px-2" style={{ fontSize: isFullscreen ? '1rem' : '0.875rem' }}>
          <Clock className="w-4 h-4" />
          Time
        </div>
        {rinks.map((rink) => (
          <div key={rink} className="text-center py-2">
            <span className="font-semibold text-gray-700" style={{ fontSize: isFullscreen ? '1.1rem' : '0.875rem' }}>
              Rink {rink}
            </span>
          </div>
        ))}
      </div>

      {/* Slot rows */}
      <div className={cn('gap-2', isFullscreen ? 'flex flex-col flex-1' : 'space-y-2')}>
        {timeSlots.map((slot) => (
          <div key={slot.start} className={cn('grid gap-2', isFullscreen && 'flex-1')} style={gridStyle}>
            <div className="flex items-center px-2 font-medium text-gray-600" style={{ fontSize: isFullscreen ? '1rem' : '0.875rem' }}>
              {slot.label}
            </div>
            {rinks.map((rink) => {
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
                      {isFullscreen ? (
                        isLeagueBooking(booking) ? (
                          <>
                            {getLeagueBookingDisplay(booking).leagueName && (
                              <span className="opacity-80 mt-0.5" style={{ fontSize: '0.9rem' }}>
                                {getLeagueBookingDisplay(booking).leagueName}
                              </span>
                            )}
                            {booking.notes && (
                              <span className="opacity-80 mt-0.5 line-clamp-2" style={{ fontSize: '0.9rem' }}>
                                {booking.notes}
                              </span>
                            )}
                          </>
                        ) : (
                          (() => {
                            const compType = booking.competition_type === 'Other' && booking.competition_other
                              ? booking.competition_other
                              : booking.competition_type;
                            const mainParts = [compType, booking.booking_format].filter(Boolean).join(' - ');
                            const line = booking.notes ? `${mainParts}. ${booking.notes}` : mainParts;
                            return line ? (
                              <span className="opacity-80 mt-0.5 line-clamp-2" style={{ fontSize: '0.9rem' }}>
                                {line}
                              </span>
                            ) : null;
                          })()
                        )
                      ) : (
                        isLeagueBooking(booking) ? (
                          <span className="opacity-80 mt-0.5" style={{ fontSize: '0.75rem' }}>
                            {getLeagueBookingDisplay(booking).leagueName}
                          </span>
                        ) : (
                          booking.competition_type && (
                            <span className="opacity-80 mt-0.5" style={{ fontSize: '0.75rem' }}>
                              {booking.competition_type === 'Other' && booking.competition_other
                                ? booking.competition_other
                                : booking.competition_type}
                            </span>
                          )
                        )
                      )}
                      {isRollup && (
                        <span className="font-semibold flex items-center gap-1 mt-1 opacity-90" style={{ fontSize: isFullscreen ? '0.95rem' : '0.75rem' }}>
                          <Users className="w-3.5 h-3.5" />
                          {rollupCount}/8
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-medium text-center w-full" style={{ fontSize: isFullscreen ? '1rem' : '0.75rem' }}>
                      Available
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}