import React from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  onBookingClick
}) {
  const TIME_SLOTS = generateTimeSlots(
    club?.opening_time,
    club?.closing_time,
    club?.session_duration
  );
  
  const RINKS = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);

  const getBookingForSlot = (rink, startTime) => {
    return bookings.find(
      b => b.rink_number === rink && 
           b.start_time === startTime && 
           b.status !== 'cancelled' &&
           b.status !== 'rejected'
    );
  };

  const isSlotAvailable = (rink, startTime) => {
    const booking = getBookingForSlot(rink, startTime);
    return !booking || booking.status === 'rejected' || booking.status === 'cancelled';
  };

  const isSlotSelected = (rink, slotIndex) => {
    return selectedSlots.some(s => s.rink === rink && s.slotIndex === slotIndex);
  };

  const canSelectSlot = (rink, slotIndex) => {
    if (selectedSlots.length === 0) return true;
    
    // Must be same rink
    const sameRinkSelected = selectedSlots.filter(s => s.rink === rink);
    if (sameRinkSelected.length === 0 && selectedSlots.length > 0) return false;
    
    // Must be adjacent
    const selectedIndices = sameRinkSelected.map(s => s.slotIndex);
    const minIndex = Math.min(...selectedIndices);
    const maxIndex = Math.max(...selectedIndices);
    
    return slotIndex === minIndex - 1 || slotIndex === maxIndex + 1;
  };

  const handleSlotClick = (rink, slot, slotIndex) => {
    const booking = getBookingForSlot(rink, slot.start);
    
    // If clicking on an existing booking, show details
    if (booking && onBookingClick) {
      onBookingClick(booking);
      return;
    }
    
    if (!isSlotAvailable(rink, slot.start)) return;
    
    if (onMultiSlotSelect) {
      const isSelected = isSlotSelected(rink, slotIndex);
      
      if (isSelected) {
        // Can only deselect if it's at the edge
        const sameRinkSelected = selectedSlots.filter(s => s.rink === rink);
        const selectedIndices = sameRinkSelected.map(s => s.slotIndex);
        const minIndex = Math.min(...selectedIndices);
        const maxIndex = Math.max(...selectedIndices);
        
        if (slotIndex === minIndex || slotIndex === maxIndex) {
          onMultiSlotSelect(selectedSlots.filter(s => !(s.rink === rink && s.slotIndex === slotIndex)));
        }
      } else if (canSelectSlot(rink, slotIndex)) {
        onMultiSlotSelect([...selectedSlots, { rink, slot, slotIndex }]);
      } else if (selectedSlots.length > 0 && selectedSlots[0].rink !== rink) {
        // Starting fresh on a new rink
        onMultiSlotSelect([{ rink, slot, slotIndex }]);
      }
    } else if (onSlotClick) {
      onSlotClick(rink, slot);
    }
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className={`grid gap-2 mb-3`} style={{ gridTemplateColumns: `1fr repeat(${RINKS.length}, 1fr)` }}>
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
                style={{ gridTemplateColumns: `1fr repeat(${RINKS.length}, 1fr)` }}
              >
                <div className="p-3 text-sm text-gray-600 font-medium flex items-center">
                  {slot.label}
                </div>
                {RINKS.map(rink => {
                  const booking = getBookingForSlot(rink, slot.start);
                  const available = isSlotAvailable(rink, slot.start);
                  const isOwnBooking = booking?.booker_email === currentUserEmail;
                  const StatusIcon = booking ? statusIcons[booking.status] : null;
                  const selected = isSlotSelected(rink, slotIndex);
                  const canSelect = available && (selectedSlots.length === 0 || canSelectSlot(rink, slotIndex) || selectedSlots[0].rink !== rink);

                  return (
                    <Tooltip key={rink}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleSlotClick(rink, slot, slotIndex)}
                          disabled={!available}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all duration-200 min-h-[60px] relative",
                            available && !selected
                              ? "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer hover:scale-[1.02]"
                              : available && selected
                              ? "bg-emerald-100 border-emerald-500 cursor-pointer"
                              : cn(statusStyles[booking?.status], "cursor-default"),
                            available && canSelect && "hover:shadow-md",
                            available && !canSelect && selectedSlots.length > 0 && "opacity-50"
                          )}
                        >
                          {available ? (
                            selected ? (
                              <div className="flex items-center justify-center">
                                <Check className="w-5 h-5 text-emerald-700" />
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600">Available</span>
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {StatusIcon && (
                                <StatusIcon className={cn(
                                  "w-4 h-4",
                                  booking?.status === 'pending' && "animate-spin"
                                )} />
                              )}
                              <span className="text-xs font-medium truncate max-w-full">
                                {booking?.booker_name?.split(' ')[0]}
                              </span>
                              {isOwnBooking && (
                                <span className="text-[10px] opacity-75">(You)</span>
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {available ? (
                          selected ? (
                            <p>Click to deselect</p>
                          ) : canSelect ? (
                            <p>Click to select Rink {rink} at {slot.label}</p>
                          ) : (
                            <p>Select adjacent slots only</p>
                          )
                        ) : (
                          <div className="text-center">
                            <p className="font-medium">{booking?.booker_name}</p>
                            <p className="text-xs capitalize">{booking?.status}</p>
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