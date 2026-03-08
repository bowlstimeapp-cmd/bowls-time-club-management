import React, { useState, useRef } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Check, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const generateTimeSlots = (openingTime = '10:00', closingTime = '21:00', duration = 2) => {
  const slots = [];
  const [openHour] = openingTime.split(':').map(Number);
  const [closeHour] = closingTime.split(':').map(Number);
  for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
    const startHour = hour;
    const endHour = hour + duration;
    const formatHour = (h) => h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    slots.push({
      start: `${String(startHour).padStart(2, '0')}:00`,
      end: `${String(endHour).padStart(2, '0')}:00`,
      label: `${formatHour(startHour)} - ${formatHour(endHour)}`,
      index: slots.length
    });
  }
  return slots;
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
}) {
  const [draggingBooking, setDraggingBooking] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const justDropped = useRef(false);

  const TIME_SLOTS = generateTimeSlots(club?.opening_time, club?.closing_time, club?.session_duration);
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
    const [hours] = slotStart.split(':').map(Number);
    slotDateTime.setHours(hours, 0, 0, 0);
    return slotDateTime <= now;
  };

  const handleSlotClick = (rink, slot, slotIndex) => {
    // Ignore click events triggered right after a drag
    if (draggingBooking) return;

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
    if (!isSlotAvailable(rink, slot.start)) return;
    if (isSlotInPast(slot.start)) return;
    onMoveBooking && onMoveBooking(booking, rink, slot.start);
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
                  const canDrag = !!booking && (isOwnBooking || isAdmin) && !!onMoveBooking && !isPast;
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

                  // Drop zone styling
                  const isDroppable = available && !isPast && isDragging;
                  const isHoverTarget = dropTarget === `${rink}:${slot.start}`;

                  return (
                    <Tooltip key={rink}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleSlotClick(rink, slot, slotIndex)}
                          disabled={available && !canSelect && !isDragging && selectedSlots.length > 0 && selectedSlots[0].rink === rink}
                          draggable={canDrag}
                          onDragStart={canDrag ? (e) => {
                            e.dataTransfer.setData('text/plain', booking.id);
                            e.dataTransfer.effectAllowed = 'move';
                            // Slight delay so the drag image captures before state update
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
                            // Available slot — normal
                            available && !selected && !isDroppable && "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer hover:scale-[1.01]",
                            // Available slot — selected
                            available && selected && "bg-emerald-100 border-emerald-500 cursor-pointer",
                            // Available slot — drop zone (something being dragged)
                            available && isDroppable && !isHoverTarget && "bg-blue-50 border-blue-300 border-dashed",
                            // Available slot — hover drop zone
                            available && isHoverTarget && "bg-blue-100 border-blue-500 scale-[1.03] shadow-md",
                            // Booked slot
                            !available && cn(statusStyles[booking?.status]),
                            !available && canDrag && "cursor-grab active:cursor-grabbing",
                            !available && !canDrag && "cursor-pointer",
                            // Disabled (non-adjacent)
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
                              <div className="flex items-center gap-1">
                                {StatusIcon && (
                                  <StatusIcon className={cn(
                                    "w-3 h-3 shrink-0",
                                    booking?.status === 'pending' && "animate-spin"
                                  )} />
                                )}
                                <span className="text-xs font-semibold truncate leading-tight">
                                  {isOwnBooking ? 'You' : booking?.booker_name}
                                </span>
                              </div>
                              {booking?.competition_type && (
                                <span className="text-[10px] lg:text-xs opacity-80 truncate leading-tight">
                                  {booking.competition_type === 'Other' && booking.competition_other
                                    ? booking.competition_other
                                    : booking.competition_type}
                                  {booking.booking_format && ` – ${booking.booking_format}`}
                                </span>
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
                            {isRollup && <p className="text-xs">{rollupCount}/8 members</p>}
                            {canDrag && <p className="text-xs text-gray-400 mt-1">Drag to move</p>}
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