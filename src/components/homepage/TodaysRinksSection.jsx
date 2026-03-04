import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckCircle, Clock } from 'lucide-react';
import HomepageSection from './HomepageSection';

function generateSlots(openingTime, closingTime, sessionDuration) {
  const slots = [];
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const durationMins = sessionDuration * 60;

  let currentMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  while (currentMins + durationMins <= closeMins) {
    const sh = String(Math.floor(currentMins / 60)).padStart(2, '0');
    const sm = String(currentMins % 60).padStart(2, '0');
    const eh = String(Math.floor((currentMins + durationMins) / 60)).padStart(2, '0');
    const em = String((currentMins + durationMins) % 60).padStart(2, '0');
    slots.push({ start: `${sh}:${sm}`, end: `${eh}:${em}` });
    currentMins += durationMins;
  }
  return slots;
}

export default function TodaysRinksSection({ club, bookings }) {
  if (!club) return null;

  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b =>
    b.date === today && b.status !== 'rejected' && b.status !== 'cancelled'
  );

  const rinkCount = club.rink_count || 6;
  const openingTime = club.opening_time || '10:00';
  const closingTime = club.closing_time || '21:00';
  const sessionDuration = club.session_duration || 2;

  const timeSlots = generateSlots(openingTime, closingTime, sessionDuration);
  const rinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

  // Check if a rink/slot is booked
  const isBooked = (rinkNumber, slot) => {
    return todaysBookings.some(b =>
      b.rink_number === rinkNumber &&
      b.start_time === slot.start &&
      b.end_time === slot.end
    );
  };

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const isCurrentSlot = (slot) => {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
  };

  const isPastSlot = (slot) => {
    const [eh, em] = slot.end.split(':').map(Number);
    return nowMins >= eh * 60 + em;
  };

  // Count free rinks for each slot
  const slotSummary = timeSlots.map(slot => {
    const bookedCount = rinks.filter(r => isBooked(r, slot)).length;
    const freeCount = rinkCount - bookedCount;
    return { slot, freeCount, bookedCount };
  });

  return (
    <HomepageSection title="Today's Rink Availability">
      <div className="space-y-3">
        {timeSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sessions configured</p>
          </div>
        ) : (
          <>
            {/* Summary view */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {slotSummary.map(({ slot, freeCount, bookedCount }) => {
                const current = isCurrentSlot(slot);
                const past = isPastSlot(slot);
                return (
                  <div
                    key={slot.start}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      past ? 'opacity-40 bg-gray-50 border-gray-100' :
                      current ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {current && <Clock className="w-3 h-3 text-emerald-600" />}
                      <span className="text-xs font-semibold text-gray-700">{slot.start} – {slot.end}</span>
                    </div>
                    {freeCount > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-600">{freeCount} free</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-red-500">Full</span>
                    )}
                    {bookedCount > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{bookedCount} booked</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rink detail grid */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-2 text-left font-medium text-gray-600">Time</th>
                      {rinks.map(r => (
                        <th key={r} className="p-2 text-center font-medium text-gray-600">Rink {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(slot => {
                      const current = isCurrentSlot(slot);
                      const past = isPastSlot(slot);
                      return (
                        <tr
                          key={slot.start}
                          className={`border-b last:border-0 ${current ? 'bg-emerald-50' : past ? 'opacity-40' : ''}`}
                        >
                          <td className="p-2 font-medium text-gray-700 whitespace-nowrap">
                            {slot.start}
                            {current && <span className="ml-1 text-emerald-600">▶</span>}
                          </td>
                          {rinks.map(r => {
                            const booked = isBooked(r, slot);
                            return (
                              <td key={r} className="p-2 text-center">
                                {booked ? (
                                  <Badge className="bg-red-100 text-red-600 border-red-200 text-xs px-1.5 py-0">Booked</Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0">Free</Badge>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </HomepageSection>
  );
}