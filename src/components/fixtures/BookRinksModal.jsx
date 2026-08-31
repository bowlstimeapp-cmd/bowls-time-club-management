import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function addHoursToTime(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
}

export default function BookRinksModal({ open, onClose, fixture, competition, club, onBooked }) {
  const [selectedRinks, setSelectedRinks] = useState([]);
  const [clashes, setClashes] = useState(null);
  const [booking, setBooking] = useState(false);
  const initializedRef = useRef(false);

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['fixtureBookings', club?.id, fixture?.date],
    queryFn: () => base44.functions.invoke('listBookings', { clubId: club.id, date: fixture.date }),
    enabled: open && !!fixture && !!club,
  });

  const bookings = bookingsData?.data?.bookings || [];
  const startTime = fixture?.time || '';
  const endTime = fixture ? addHoursToTime(fixture.time, club?.session_duration || 2) : '';
  const allRinkNumbers = useMemo(
    () => Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1),
    [club?.rink_count]
  );

  const isRinkBooked = (rink) => bookings.some(b => {
    if (b.status === 'cancelled' || b.status === 'rejected') return false;
    return b.rink_number === rink && startTime < b.end_time && endTime > b.start_time;
  });

  const getRinkBooking = (rink) => bookings.find(b => {
    if (b.status === 'cancelled' || b.status === 'rejected') return false;
    return b.rink_number === rink && startTime < b.end_time && endTime > b.start_time;
  });

  // Initialize selected rinks when bookings load
  useEffect(() => {
    if (!isLoading && !initializedRef.current && fixture && competition && bookingsData?.data) {
      const freeRinks = allRinkNumbers.filter(r => !isRinkBooked(r));
      setSelectedRinks(freeRinks.slice(0, competition.home_rinks || 2));
      initializedRef.current = true;
    }
  }, [isLoading, fixture, competition, bookingsData, allRinkNumbers, startTime, endTime]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setClashes(null);
      setSelectedRinks([]);
    }
  }, [open]);

  const toggleRink = (rink) => {
    if (isRinkBooked(rink)) return;
    setSelectedRinks(prev => prev.includes(rink) ? prev.filter(r => r !== rink) : [...prev, rink]);
  };

  const doBooking = async (rinks) => {
    setBooking(true);
    setClashes(null);
    try {
      const res = await base44.functions.invoke('bookFixtureRinks', { fixtureId: fixture.id, club_id: club.id, rinks });
      if (res.data.success) {
        toast.success(`Booked ${res.data.bookings.length} rink(s)`);
        onBooked?.();
        onClose();
      } else if (res.data.clashes) {
        setClashes(res.data.clashes);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to book rinks');
    } finally {
      setBooking(false);
    }
  };

  const handleProceedWithAlternates = () => {
    if (!clashes) return;
    const usedRinks = new Set();
    const newRinks = selectedRinks.map(rink => {
      const clash = clashes.find(c => c.rink === rink);
      if (clash && clash.suggestedAlternates.length > 0) {
        const alt = clash.suggestedAlternates.find(a => !usedRinks.has(a));
        if (alt) { usedRinks.add(alt); return alt; }
      }
      usedRinks.add(rink);
      return rink;
    });
    setSelectedRinks(newRinks);
    doBooking(newRinks);
  };

  if (!fixture || !club) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book Rinks — {fixture.date} at {fixture.time}</DialogTitle>
        </DialogHeader>

        {clashes ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">Rink clashes detected</p>
                <p className="text-amber-700 mt-1">Some selected rinks are already booked. Review the suggestions below.</p>
              </div>
            </div>
            {clashes.map((clash, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Rink {clash.rink}</span>
                  {clash.clashWith && (
                    <span className="text-sm text-gray-500">
                      Booked by {clash.clashWith.booker_name} ({clash.clashWith.start_time}–{clash.clashWith.end_time})
                    </span>
                  )}
                </div>
                {clash.suggestedAlternates.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Suggested: Rink{clash.suggestedAlternates.length > 1 ? 's' : ''} {clash.suggestedAlternates.join(', ')}</span>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">No free alternatives available</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Time: {startTime}–{endTime} • {selectedRinks.length} rink(s) selected
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {allRinkNumbers.map(rink => {
                  const booked = isRinkBooked(rink);
                  const selected = selectedRinks.includes(rink);
                  const bookingInfo = getRinkBooking(rink);
                  return (
                    <button
                      key={rink}
                      onClick={() => toggleRink(rink)}
                      disabled={booked}
                      className={`relative aspect-square rounded-lg border-2 font-semibold transition-all text-sm ${
                        booked
                          ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed'
                          : selected
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                      title={booked && bookingInfo ? `Booked: ${bookingInfo.booker_name} (${bookingInfo.start_time}–${bookingInfo.end_time})` : booked ? 'Booked' : 'Click to select'}
                    >
                      R{rink}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {clashes ? (
            <Button onClick={handleProceedWithAlternates} disabled={booking}>
              {booking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Proceed with suggested alternates
            </Button>
          ) : (
            <Button onClick={() => selectedRinks.length > 0 && doBooking(selectedRinks)} disabled={booking || selectedRinks.length === 0}>
              {booking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Book {selectedRinks.length} Rink{selectedRinks.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}