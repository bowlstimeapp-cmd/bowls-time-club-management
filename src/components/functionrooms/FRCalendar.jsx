import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { STATUS_CONFIG, CLOSED_STATUSES } from './frUtils';

const LEGEND = [
  { status: 'new_enquiry', label: 'New Enquiry' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'awaiting_response', label: 'Awaiting' },
  { status: 'provisional_hold', label: 'Provisional' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'cancelled', label: 'Cancelled' },
];

export default function FRCalendar({ bookings, onViewEnquiry }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0=Sun

  // Group bookings by date
  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!bookingsByDate[b.date]) bookingsByDate[b.date] = [];
    bookingsByDate[b.date].push(b);
  });

  const monthBookings = bookings.filter(b => {
    const d = new Date(b.date);
    return isSameMonth(d, currentMonth);
  });

  const confirmedCount = monthBookings.filter(b => ['confirmed', 'approved'].includes(b.status)).length;
  const enquiryCount = monthBookings.filter(b => ['new_enquiry', 'pending', 'contacted', 'awaiting_response', 'provisional_hold'].includes(b.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 w-40 text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm text-gray-500" onClick={() => setCurrentMonth(new Date())}>Today</Button>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <span><span className="font-semibold text-emerald-600">{confirmedCount}</span> confirmed</span>
          <span><span className="font-semibold text-blue-600">{enquiryCount}</span> enquiries</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {LEGEND.map(({ status, label }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className={`w-3 h-3 rounded-full ${cfg.dotColor}`} />
              {label}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for start offset */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-t border-gray-100" />
            ))}

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate[dateStr] || [];
              const today = isToday(day);

              return (
                <div key={dateStr} className={`min-h-[80px] border-t border-gray-100 p-1 ${today ? 'bg-emerald-50' : ''}`}>
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-emerald-600 text-white' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(b => {
                      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG['new_enquiry'];
                      return (
                        <button
                          key={b.id}
                          onClick={() => onViewEnquiry(b)}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${cfg.className} border hover:opacity-80 transition-opacity`}
                          title={`${b.contact_name} · ${b.start_time}–${b.end_time}`}
                        >
                          {b.start_time} {b.room_name || b.contact_name}
                        </button>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{dayBookings.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}