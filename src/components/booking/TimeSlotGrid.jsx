import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIME_SLOTS = [
  { start: '10:00', end: '12:00', label: '10am - 12pm' },
  { start: '12:00', end: '14:00', label: '12pm - 2pm' },
  { start: '14:00', end: '16:00', label: '2pm - 4pm' },
  { start: '16:00', end: '18:00', label: '4pm - 6pm' },
  { start: '18:00', end: '20:00', label: '6pm - 8pm' },
];

const RINKS = [1, 2, 3, 4, 5, 6];

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

export default function TimeSlotGrid({ bookings, selectedDate, onSlotClick, currentUserEmail }) {
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

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-7 gap-2 mb-3">
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
              <motion.div
                key={slot.start}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: slotIndex * 0.05 }}
                className="grid grid-cols-7 gap-2"
              >
                <div className="p-3 text-sm text-gray-600 font-medium flex items-center">
                  {slot.label}
                </div>
                {RINKS.map(rink => {
                  const booking = getBookingForSlot(rink, slot.start);
                  const available = isSlotAvailable(rink, slot.start);
                  const isOwnBooking = booking?.booker_email === currentUserEmail;
                  const StatusIcon = booking ? statusIcons[booking.status] : null;

                  return (
                    <Tooltip key={rink}>
                      <TooltipTrigger asChild>
                        <motion.button
                          whileHover={{ scale: available ? 1.02 : 1 }}
                          whileTap={{ scale: available ? 0.98 : 1 }}
                          onClick={() => available && onSlotClick(rink, slot)}
                          disabled={!available}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all duration-200 min-h-[60px] relative",
                            available
                              ? "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
                              : cn(statusStyles[booking?.status], "cursor-default"),
                            available && "hover:shadow-md"
                          )}
                        >
                          {available ? (
                            <span className="text-xs font-medium text-emerald-600">Available</span>
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
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {available ? (
                          <p>Click to book Rink {rink} at {slot.label}</p>
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
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export { TIME_SLOTS, RINKS };