/**
 * Senior Book a Rink
 * Step 1 → date, Step 2 → session (morning/afternoon/evening), Step 3 → pick rink card
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SeniorLayout from '@/components/senior/SeniorLayout';
import { format, addDays, startOfToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import BookingModal from '@/components/booking/BookingModal';

const SESSION_PERIODS = [
  { id: 'morning',   label: 'Morning',   emoji: '🌅', hint: 'Before 12:00 noon' },
  { id: 'afternoon', label: 'Afternoon', emoji: '☀️', hint: 'Noon to 5pm' },
  { id: 'evening',   label: 'Evening',   emoji: '🌙', hint: 'After 5pm' },
];

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function slotPeriod(startTime) {
  const m = timeToMins(startTime);
  if (m < 720) return 'morning';
  if (m < 1020) return 'afternoon';
  return 'evening';
}

function generateSlots(club) {
  if (!club) return [];
  if (club.use_custom_sessions && club.custom_sessions?.length > 0) {
    return club.custom_sessions.map(s => ({ start: s.start, end: s.end }));
  }
  const slots = [];
  const duration = club.session_duration || 2;
  const [oh, om] = (club.opening_time || '09:00').split(':').map(Number);
  const [ch, cm] = (club.closing_time || '21:00').split(':').map(Number);
  let cur = oh * 60 + om;
  const close = ch * 60 + cm;
  while (cur + duration * 60 <= close) {
    const s = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
    const e = `${String(Math.floor((cur + duration * 60) / 60)).padStart(2, '0')}:${String((cur + duration * 60) % 60).padStart(2, '0')}`;
    slots.push({ start: s, end: e });
    cur += duration * 60;
  }
  return slots;
}

export default function SeniorBookRink() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1); // 1=date, 2=period, 3=rink
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null); // {rink, slot:{start,end}}
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => { const c = await base44.entities.Club.filter({ id: clubId }); return c[0]; },
    enabled: !!clubId,
  });

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', clubId, dateString],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, date: dateString }),
    enabled: !!clubId && step >= 3,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createBooking', data);
      return res.data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setModalOpen(false);
      setStep(1);
      setSelectedDate(startOfToday());
      setSelectedPeriod(null);
      setSelectedSlot(null);
      toast.success('Your rink has been booked!');
    },
  });

  const rinkCount = club?.rink_count || 6;
  const allSlots = generateSlots(club);

  // For step 3: slots in chosen period, per rink
  const periodSlots = allSlots.filter(s => slotPeriod(s.start) === selectedPeriod);
  const bookedKeys = new Set(bookings.filter(b => b.status !== 'cancelled').map(b => `${b.rink_number}-${b.start_time}`));

  const isRinkFullyBooked = (rink) => periodSlots.every(s => bookedKeys.has(`${rink}-${s.start}`));

  const handleConfirm = async (notes, competitionType, competitionOther, rollupMembers = [], bookingFormat = '') => {
    if (!user || !selectedSlot) return;
    const bookerName = user.first_name && user.surname ? `${user.first_name} ${user.surname}` : (user.full_name || user.email);
    const status = club?.auto_approve_bookings ? 'approved' : 'pending';
    await createBookingMutation.mutateAsync({
      club_id: clubId,
      rink_number: selectedSlot.rink,
      date: dateString,
      start_time: selectedSlot.slot.start,
      end_time: selectedSlot.slot.end,
      status,
      competition_type: competitionType,
      competition_other: competitionType === 'Other' ? competitionOther : '',
      booking_format: bookingFormat || null,
      booker_name: bookerName,
      booker_email: user.email,
      notes: notes || '',
      rollup_members: competitionType === 'Roll-up' ? rollupMembers : [],
    });
  };

  // Generate next 14 days for date picker
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

  return (
    <SeniorLayout>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1,2,3].map(s => (
          <React.Fragment key={s}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              step === s ? 'bg-emerald-600 text-white' :
              step > s ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-500'
            }`}>{step > s ? <CheckCircle2 className="w-5 h-5" /> : s}</div>
            {s < 3 && <div className={`h-1 flex-1 rounded ${step > s ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Choose date */}
      {step === 1 && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Step 1: Choose a Date</h1>
          <p className="text-lg text-gray-600 mb-5">Which day would you like to book?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {days.map(day => {
              const isSelected = format(day, 'yyyy-MM-dd') === dateString;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setStep(2); }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold min-h-[80px] transition-colors ${
                    isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400'
                  }`}
                >
                  <span className="text-sm">{format(day, 'EEE')}</span>
                  <span className="text-2xl">{format(day, 'd')}</span>
                  <span className="text-sm">{format(day, 'MMM')}</span>
                </button>
              );
            })}
          </div>
          <p className="text-base text-gray-500 text-center">Tap a date to continue</p>
        </div>
      )}

      {/* Step 2: Choose session period */}
      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-4 min-h-[44px]">
            <ChevronLeft className="w-5 h-5" /> Back to Date
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Step 2: Choose a Session</h1>
          <p className="text-lg text-gray-600 mb-5">{format(selectedDate, 'EEEE, d MMMM yyyy')}</p>
          <div className="space-y-3">
            {SESSION_PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPeriod(p.id); setStep(3); }}
                className="w-full flex items-center gap-5 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-500 transition-colors min-h-[80px]"
              >
                <span className="text-4xl">{p.emoji}</span>
                <div className="text-left">
                  <p className="text-xl font-bold text-gray-900">{p.label}</p>
                  <p className="text-base text-gray-500">{p.hint}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Choose rink */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-4 min-h-[44px]">
            <ChevronLeft className="w-5 h-5" /> Back to Session
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Step 3: Choose a Rink</h1>
          <p className="text-lg text-gray-600 mb-5">
            {format(selectedDate, 'EEEE, d MMMM')} &bull; {SESSION_PERIODS.find(p => p.id === selectedPeriod)?.label}
          </p>
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              <span className="text-lg text-gray-600">Checking availability…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: rinkCount }, (_, i) => i + 1).map(rink => {
                const fullyBooked = isRinkFullyBooked(rink);
                // Find first available slot for this rink in the period
                const firstAvailable = periodSlots.find(s => !bookedKeys.has(`${rink}-${s.start}`));
                return (
                  <div
                    key={rink}
                    className={`rounded-2xl border-2 p-5 ${fullyBooked ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-200'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-2xl font-bold text-gray-900">Rink {rink}</p>
                      {fullyBooked ? (
                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-sm">Full</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">Available</span>
                      )}
                    </div>
                    {!fullyBooked && firstAvailable ? (
                      <>
                        <p className="text-base text-gray-600 mb-4">{firstAvailable.start} – {firstAvailable.end}</p>
                        <button
                          onClick={() => { setSelectedSlot({ rink, slot: firstAvailable }); setModalOpen(true); }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-3 px-4 rounded-xl min-h-[52px] transition-colors"
                        >
                          Book Rink {rink}
                        </button>
                      </>
                    ) : (
                      <p className="text-base text-gray-500">No slots available this session.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking confirmation modal (reuses existing component) */}
      {modalOpen && selectedSlot && (
        <BookingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          selectedSlots={[{ rink: selectedSlot.rink, slot: selectedSlot.slot, slotIndex: 0 }]}
          selectedDate={selectedDate}
          onConfirm={handleConfirm}
          isLoading={createBookingMutation.isPending}
          club={club}
          members={[]}
          currentUserEmail={user?.email}
        />
      )}
    </SeniorLayout>
  );
}