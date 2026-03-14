import React, { useState, useRef } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Check, Users, UserPlus, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const generateTimeSlots = (openingTime = '10:00', closingTime = '21:00', duration = 2) => {
  const slots = [];
  const [openHour, openMin = 0] = openingTime.split(':').map(Number);
  const [closeHour, closeMin = 0] = closingTime.split(':').map(Number);
  const openMins = openHour * 60 + openMin;
  const closeMins = closeHour * 60 + closeMin;
  const durationMins = duration * 60;

  let cur = openMins;
  while (cur + durationMins <= closeMins) {
    const startH = Math.floor(cur / 60);
    const startM = cur % 60;
    const endMins = cur + durationMins;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const fmt = (h, m) => {
      const ampm = h < 12 ? 'am' : 'pm';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
    };
    const startStr = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`;
    const endStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    slots.push({ start: startStr, end: endStr, label: `${fmt(startH, startM)} - ${fmt(endH, endM)}`, index: slots.length });
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
  return customSessions.map((s, i) => ({
    start: s.start,
    end: s.end,
    label: `${fmt(s.start)} - ${fmt(s.end)}`,
    index: i,
  }));
};

const statusStyles = {
  approved: 'bg-emerald-500 text-white border-emerald-600',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

const statusIcons = {
  approved: CheckCircle,
  pending: Loader2,
  rejected: XCircle,
  cancelled: XCircle,
};

export default function TimeSlotGrid({
  bookings,
  selectedDate,
  onSlotClick,
  currentUserEmail,
  club,
  selectedSlots = [],
  onMultiSlotSelect,
  onBookingClick,
  onJoinRollup,
  joinLoading,
  isAdmin = false,
  onMoveBooking,
  onSwapBookings,
  leagueFixtures = [],
  leagueTeams = [],
  leagues = [],
  bulkDeleteMode = false,
  bulkDeleteSelected = [],
  onToggleBulkDelete,
}) {
  const [draggingBooking, setDraggingBooking] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const justDropped = useRef(false);

  const TIME_SLOTS = club?.use_custom_sessions && club?.custom_sessions?.length > 0
    ? generateCustomSlots(club.custom_sessions)
    : generateTimeSlots(club?.opening_time, club?.closing_time, club?.session_duration);

  const RINKS = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);

  const getBookingForSlot = (rink, startTime) =>
    bookings.find(b =>
      b.rink_number === rink &&
      b.start_time === startTime &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected'
    );

  const isSlotAvailable = (rink, startTime) => !getBookingForSlot(rink, startTime);

  const isSlotSelected = (rink, slotIndex) =>
    selectedSlots.some(s => s.rink === rink && s.slotIndex === slotIndex);

  const canSelectSlot = (rink, slotIndex) => {
    if (selectedSlots.length === 0) return true;
    const sameRinkSelected = selectedSlots.filter(s => s.rink === rink);
    if (sameRinkSelected.length === 0) return false;
    const selectedIndices = sameRinkSelected.map(s => s.slotIndex);
    const minIndex = Math.min(...selectedIndices);
    const maxIndex = Math.max(...selectedIndices);
    return slotIndex === minIndex - 1 || slotIndex === maxIndex + 1;
  };

  const isSlotInPast = (slotStart) => {
    if (!selectedDate) return false;
    const now = new Date();
    const slotDateTime = new Date(selectedDate);
    const [hours, mins] = slotStart.split(':').map(Number);
    slotDateTime.setHours(hours, mins, 0, 0);
    return slotDateTime <= now;
  };

  // Get league fixture info for a booking
  const getLeagueInfo = (booking) => {
    if (!booking) return null;
    const fixture = leagueFixtures.find(f => f.booking_id === booking.id);
    if (!fixture) return null;
    const league = leagues.find(l => l.id === fixture.league_id);
    const homeTeam = leagueTeams.find(t => t.id === fixture.home_team_id);
    const awayTeam = leagueTeams.find(t => t.id === fixture.away_team_id);
    return { league, homeTeam, awayTeam };
  };

  const handleSlotClick = (rink, slot, slotIndex) => {
    if (justDropped.current) return;

    const booking = getBookingForSlot(rink, slot.start);
    if (booking && onBookingClick) {
      onBookingClick(booking);
      return;
    }
    if (!isSlotAvailable(rink, slot.start)) return;

    if (onMultiSlotSelect) {
      const isSelected = isSlotSelected(rink, slotIndex);
      if (isSelected) {
        onMultiSlotSelect(selectedSlots.filter(s => !(s.rink === rink && s.slotIndex === slotIndex)));
      } else if (canSelectSlot(rink, slotIndex)) {
        onMultiSlotSelect([...selectedSlots, { rink, slot, slotIndex }]);
      } else if (selectedSlots.length > 0 && selectedSlots[0].rink !== rink) {
        onMultiSlotSelect([{ rink, slot, slotIndex }]);
      }
    } else if (onSlotClick) {
      onSlotClick(rink, slot);
    }
  };

  const handleDrop = (e, rink, slot) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('text/plain');
    const booking = bookings.find(b => b.id === bookingId) || draggingBooking;
    if (!booking) return;

    justDropped.current = true;
    setTimeout(() => { justDropped.current = false; }, 300);

    const targetBooking = getBookingForSlot(rink, slot.start);

    // Admin swap: dragging onto another booking
    if (targetBooking && isAdmin && onSwapBookings && targetBooking.id !== booking.id) {
      onSwapBookings(booking, targetBooking);
    } else if (!targetBooking && !isSlotInPast(slot.start)) {
      onMoveBooking && onMoveBooking(booking, rink, slot.start);
    }

    setDraggingBooking(null);
    setDropTarget(null);
  };

  const openRollupsEnabled = club?.open_rollups;
  const isDragging = !!draggingBooking;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div style={{ minWidth: `${120 + RINKS.length * 80}px` }}>
          {/* Header */}
          <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `120px repeat(${RINKS.length}, minmax(70px, 1fr))` }}>
            <div className="p-3 text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </div>
            {RINKS.map(rink => (
              <div key={rink} className="p-3 text-center">
                <span className="text-sm font-semibold text-gray-700">Rink {rink}</span>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            {TIME_SLOTS.map((slot, slotIndex) => (
              <div
                key={slot.start}
                className="grid gap-2"
                style={{ gridTemplateColumns: `120px repeat(${RINKS.length}, minmax(70px, 1fr))` }}
              >
                <div className="p-3 text-sm text-gray-600 font-medium flex items-center">
                  {slot.label}
                </div>
                {RINKS.map(rink => {
                  const booking = getBookingForSlot(rink, slot.start);
                  const available = isSlotAvailable(rink, slot.start);
                  const isPast = isSlotInPast(slot.start);
                  const isOwnBooking = booking?.booker_email === currentUserEmail;
                  const canDrag = !!booking && (isOwnBooking || isAdmin) && !isPast;
                  const StatusIcon = booking ? statusIcons[booking.status] : null;
                  const selected = isSlotSelected(rink, slotIndex);
                  const canSelect = available && (selectedSlots.length === 0 || canSelectSlot(rink, slotIndex) || selectedSlots[0].rink !== rink);

                  // Roll-up
                  const isRollup = booking?.competition_type === 'Roll-up';
                  const rollupCount = (booking?.rollup_members?.length || 0) + 1;
                  const rollupFull = rollupCount >= 8;
                  const alreadyInRollup = currentUserEmail && (
                    booking?.booker_email === currentUserEmail ||
                    booking?.rollup_members?.some(m => m.email === currentUserEmail)
                  );
                  const canJoinRollup = isRollup && openRollupsEnabled && !rollupFull && !alreadyInRollup && currentUserEmail;

                  // League info
                  const leagueInfo = getLeagueInfo(booking);

                  // Drop zone: empty slot OR admin swapping onto booked slot
                  const isSwapTarget = !available && isAdmin && isDragging && draggingBooking?.id !== booking?.id;
                  const isEmptyDroppable = available && !isPast && isDragging;
                  const isDroppable = isEmptyDroppable || isSwapTarget;
                  const isHoverTarget = dropTarget === `${rink}:${slot.start}`;

                  return (
                    <Tooltip key={rink}>
                      <TooltipTrigger asChild>
                        <button
                        onClick={() => {
                          if (bulkDeleteMode && !available && booking) {
                            onToggleBulkDelete?.(booking.id);
                            return;
                          }
                          handleSlotClick(rink, slot, slotIndex);
                        }}
                        disabled={available && !canSelect && !isDragging && selectedSlots.length > 0 && selectedSlots[0].rink === rink && !bulkDeleteMode}
                        draggable={canDrag && !bulkDeleteMode}
                          onDragStart={canDrag ? (e) => {
                            e.dataTransfer.setData('text/plain', booking.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setTimeout(() => setDraggingBooking(booking), 0);
                          } : undefined}
                          onDragEnd={canDrag ? () => {
                            setDraggingBooking(null);
                            setDropTarget(null);
                          } : undefined}
                          onDragOver={isDroppable ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dropTarget !== `${rink}:${slot.start}`) {
                              setDropTarget(`${rink}:${slot.start}`);
                            }
                          } : undefined}
                          onDragLeave={isDroppable ? (e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              setDropTarget(null);
                            }
                          } : undefined}
                          onDrop={isDroppable ? (e) => handleDrop(e, rink, slot) : undefined}
                          className={cn(
                            "p-2 rounded-xl border-2 transition-all duration-150 min-h-[64px] lg:min-h-[80px] relative w-full text-left select-none",
                            available && !selected && !isEmptyDroppable && "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer hover:scale-[1.01]",
                            available && selected && "bg-emerald-100 border-emerald-500 cursor-pointer",
                            available && isEmptyDroppable && !isHoverTarget && "bg-blue-50 border-blue-300 border-dashed",
                            available && isHoverTarget && "bg-blue-100 border-blue-500 scale-[1.03] shadow-md",
                            !available && cn(statusStyles[booking?.status]),
                            !available && isSwapTarget && !isHoverTarget && "ring-2 ring-orange-300 ring-offset-1",
                            !available && isHoverTarget && "ring-2 ring-orange-500 ring-offset-2 scale-[1.03] shadow-md",
                            !available && canDrag && "cursor-grab active:cursor-grabbing",
                            !available && !canDrag && "cursor-pointer",
                            available && !canSelect && !isDragging && selectedSlots.length > 0 && "opacity-50"
                          )}
                        >
                          {available ? (
                            selected ? (
                              <div className="flex items-center justify-center h-full">
                                <Check className="w-5 h-5 text-emerald-700" />
                              </div>
                            ) : isHoverTarget ? (
                              <div className="flex flex-col items-center justify-center h-full gap-0.5">
                                <span className="text-xs font-semibold text-blue-600">Drop here</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-0.5">
                                <span className="text-xs font-medium text-emerald-600">Available</span>
                                <span className="text-[10px] text-emerald-500">{slot.label}</span>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col gap-0.5 h-full">
                              {isHoverTarget && isSwapTarget ? (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-xs font-semibold text-orange-600">Swap</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    {StatusIcon && (
                                      <StatusIcon className={cn("w-3 h-3 shrink-0", booking?.status === 'pending' && "animate-spin")} />
                                    )}
                                    <span className="text-xs font-semibold truncate leading-tight">
                                      {isOwnBooking ? 'You' : booking?.booker_name}
                                    </span>
                                  </div>

                                  {/* League fixture info */}
                                  {leagueInfo ? (
                                    <div className="flex flex-col gap-0.5">
                                      {leagueInfo.league && (
                                        <span className="text-[10px] font-semibold opacity-90 truncate leading-tight">
                                          {leagueInfo.league.name}
                                        </span>
                                      )}
                                      {leagueInfo.homeTeam && leagueInfo.awayTeam && (
                                        <span className="text-[10px] opacity-80 truncate leading-tight">
                                          {leagueInfo.homeTeam.name} v {leagueInfo.awayTeam.name}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    booking?.competition_type && (
                                      <span className="text-[10px] lg:text-xs opacity-80 truncate leading-tight">
                                        {booking.competition_type === 'Other' && booking.competition_other
                                          ? booking.competition_other
                                          : booking.competition_type}
                                        {booking.booking_format && ` – ${booking.booking_format}`}
                                      </span>
                                    )
                                  )}

                                  {isRollup && (
                                    <span className="text-[10px] font-semibold flex items-center gap-0.5 mt-auto">
                                      <Users className="w-2.5 h-2.5" />
                                      {rollupCount}/8
                                      {rollupFull && <span className="ml-1 text-amber-700">Full</span>}
                                    </span>
                                  )}
                                  {canJoinRollup && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onJoinRollup && onJoinRollup(booking);
                                      }}
                                      disabled={joinLoading}
                                      className="mt-1 text-[10px] font-semibold bg-emerald-600 text-white rounded px-1.5 py-0.5 hover:bg-emerald-700 flex items-center gap-0.5 w-fit"
                                    >
                                      {joinLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <UserPlus className="w-2.5 h-2.5" />}
                                      Join
                                    </button>
                                  )}
                                  {alreadyInRollup && isRollup && (
                                    <span className="text-[10px] text-emerald-700 font-medium mt-auto">✓ Joined</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {available ? (
                          isDragging ? (
                            isSlotInPast(slot.start)
                              ? <p>Cannot move to a past slot</p>
                              : <p>Drop to move here</p>
                          ) : selected ? (
                            <p>Click to deselect</p>
                          ) : canSelect ? (
                            <p>Click to select Rink {rink} at {slot.label}</p>
                          ) : (
                            <p>Select adjacent slots only</p>
                          )
                        ) : (
                          <div className="text-center">
                            <p className="font-medium">{booking?.booker_name}</p>
                            <p className="text-xs capitalize">{booking?.competition_type || booking?.status}</p>
                            {leagueInfo?.homeTeam && leagueInfo?.awayTeam && (
                              <p className="text-xs">{leagueInfo.homeTeam.name} vs {leagueInfo.awayTeam.name}</p>
                            )}
                            {isRollup && <p className="text-xs">{rollupCount}/8 members</p>}
                            {canDrag && isAdmin && !available && <p className="text-xs text-gray-400 mt-1">Drag to swap with another booking</p>}
                            {canDrag && !isAdmin && <p className="text-xs text-gray-400 mt-1">Drag to move</p>}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}