import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

// Tour date: 1st Jan 2999
export const TOUR_DATE = new Date(2999, 0, 1);
export const TOUR_DATE_STRING = '2999-01-01';

// Local storage keys
const TOUR_STEP_KEY = 'bowlstime_tour_step';
const TOUR_PAUSED_KEY = 'bowlstime_tour_paused';

export function isTourEnabled() {
  return true;
}

export async function hasTourBeenDismissed(user) {
  return !!(user?.tour_completed);
}

export async function dismissTour() {
  await base44.auth.updateMe({ tour_completed: true });
  localStorage.removeItem(TOUR_STEP_KEY);
  localStorage.removeItem(TOUR_PAUSED_KEY);
}

export function pauseTour(step) {
  localStorage.setItem(TOUR_STEP_KEY, String(step));
  localStorage.setItem(TOUR_PAUSED_KEY, 'true');
}

export function getTourPausedStep() {
  const paused = localStorage.getItem(TOUR_PAUSED_KEY);
  const step = localStorage.getItem(TOUR_STEP_KEY);
  if (paused === 'true' && step !== null) return parseInt(step);
  return null;
}

export function clearTourPause() {
  localStorage.removeItem(TOUR_STEP_KEY);
  localStorage.removeItem(TOUR_PAUSED_KEY);
}

// ─── Keyframe injection ────────────────────────────────────────────────────
const FLASH_STYLE = `
  @keyframes tourFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

function StyleInjector() {
  return <style>{FLASH_STYLE}</style>;
}

// ─── Highlight overlay ─────────────────────────────────────────────────────
export function HighlightRing({ rect, color = '#10b981', bgColor = 'rgba(16,185,129,0.18)' }) {
  if (!rect) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        zIndex: 9050,
        border: `2px dashed ${color}`,
        borderRadius: 10,
        backgroundColor: bgColor,
        boxShadow: `0 0 0 4px ${color}33`,
        pointerEvents: 'none',
        animation: 'tourFlash 1s ease-in-out infinite',
      }}
    />
  );
}

// ─── Side panel modal ──────────────────────────────────────────────────────
// On mobile: anchored to the bottom so it doesn't cover important UI elements
// On desktop: centred vertically on the right side
export function TourModal({ message, onNext, nextLabel = 'Next', onDismiss, extraButtons }) {
  return (
    <div className="
      fixed z-[9100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 pointer-events-auto
      bottom-0 left-0 right-0
      sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:right-4 sm:left-auto sm:w-80 sm:max-w-[calc(100vw-2rem)]
      w-full rounded-b-none sm:rounded-2xl
    ">
      <div className="mb-4">
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      </div>
      {extraButtons && (
        <div className="flex flex-col gap-2">
          {extraButtons}
        </div>
      )}
      {onNext && !extraButtons && (
        <div className="flex justify-end mb-3">
          <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700 text-sm" size="sm">
            {nextLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
      {onDismiss && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 text-xs underline leading-none"
          >
            Close the New User Tour and do not show again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Welcome modal ─────────────────────────────────────────────────────────
function WelcomeModal({ onStart, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-lg mx-4 pointer-events-auto relative">
        <div className="mb-5 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-3xl">🎳</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center mb-3">Welcome to BowlsTime!</h2>
        <p className="text-sm text-gray-600 leading-relaxed text-center">
          Welcome to the Bowls Time rink booking and club management system. As a new user, the team are here to guide you through the application's functionality to make using the app even easier. It's time to book your first rink (don't worry it's just a practice and not a real booking).
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onStart} className="bg-emerald-600 hover:bg-emerald-700">
            Book my first rink
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 text-xs underline leading-none"
          >
            Close the New User Tour and do not show again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resume Tour modal (shown on BookRink when paused) ─────────────────────
export function ResumeTourModal({ onResume, onDecline }) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md mx-4 pointer-events-auto relative text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-3xl">🎳</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Continue your Bowls Time New User Tour</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Would you like to continue from where you left off?
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onResume} className="bg-emerald-600 hover:bg-emerald-700">
            Yes
          </Button>
          <Button variant="outline" onClick={onDecline}>
            No
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Steps:
 *  0  – Welcome
 *  1  – Select Rink 1 @ 9am (highlight slot)
 *  2  – Click "Book 1 Slot" button (highlight button)
 *  3  – Booking modal: select Private Roll-up
 *  4  – Booking modal: submit
 *  5  – Drag booking to Rink 2 @ 9am
 *  6  – Move confirmation (Next button)
 *  7  – Click booking to view details
 *  8  – Cancel booking (highlight cancel button)
 *  9  – Select double session (Rink 1 @ 9am + 10am)
 *  10 – Click "Book 2 Slots" (highlight book button)
 *  11 – Double booking modal: submit
 *  12 – Navigate to My Bookings (no skip/next button; nav detection)
 *  -- MyBookings page picks up from here --
 *  13 – Upcoming tab: show tour bookings, explain tags
 *  14 – Highlight Past & Cancelled tab
 *  15 – Past tab clicked: show cancelled booking, offer Continue/Later
 *  -- pause here if "Continue Later" --
 *  16 – Selection nav: highlight Selection in nav
 *  -- Selection page picks up from here --
 *  17 – Selection demo card: highlight card + View button
 *  18 – SelectionView overlay: availability buttons
 *  19 – Back on Selection page: show live banner + highlight Live Scoring btn
 *  20 – After clicking Live Scoring: final modal + Finish Tour
 */
export default function NewUserTour({
  step,
  setStep,
  onDismiss,
  onComplete,
  onTourDateChange,
  // slot refs
  slot1Ref,
  slot2Ref,
  slot1_10Ref,
  tourBookingRef,
  bookingDetailCancelRef,
  bookButtonRef,
  hasSlotSelected,
  tourModalSubStep,
  setTourModalSubStep,
}) {
  const [slot1Rect, setSlot1Rect] = useState(null);
  const [slot2Rect, setSlot2Rect] = useState(null);
  const [slot1_10Rect, setSlot1_10Rect] = useState(null);
  const [bookBtnRect, setBookBtnRect] = useState(null);
  const [tourBookingRect, setTourBookingRect] = useState(null);
  const [cancelBtnRect, setCancelBtnRect] = useState(null);
  const [navRinkRect, setNavRinkRect] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (slot1Ref?.current) setSlot1Rect(slot1Ref.current.getBoundingClientRect());
      if (slot2Ref?.current) setSlot2Rect(slot2Ref.current.getBoundingClientRect());
      if (slot1_10Ref?.current) setSlot1_10Rect(slot1_10Ref.current.getBoundingClientRect());
      if (bookButtonRef?.current) setBookBtnRect(bookButtonRef.current.getBoundingClientRect());
      if (tourBookingRef?.current) setTourBookingRect(tourBookingRef.current.getBoundingClientRect());
      if (bookingDetailCancelRef?.current) setCancelBtnRect(bookingDetailCancelRef.current.getBoundingClientRect());
      const allButtons = document.querySelectorAll('nav button, header button');
      for (const btn of allButtons) {
        if (btn.textContent?.includes('Rink Booking')) {
          setNavRinkRect(btn.getBoundingClientRect());
          break;
        }
      }
    };
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, hasSlotSelected, slot1Ref, slot2Ref, slot1_10Ref, bookButtonRef, tourBookingRef, bookingDetailCancelRef]);

  const handleDismiss = async () => {
    await dismissTour();
    onDismiss();
  };

  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <>
        <StyleInjector />
        <div className="fixed inset-0 z-[9000] bg-black/40 pointer-events-none" />
        <WelcomeModal
          onStart={() => { onTourDateChange(TOUR_DATE); setStep(1); }}
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 1: Highlight Rink 1 @ 9am ───────────────────────────────────────
  if (step === 1) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={slot1Rect} />
        <TourModal
          message="To choose a session to book, click a rink on a time where a booking doesn't already exist. For the example, choose the highlighted session."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 2: Highlight "Book 1 Slot" button ───────────────────────────────
  if (step === 2) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={bookBtnRect} />
        <TourModal
          message="Click the 'Book 1 Slot' button to book the selected rink."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <StyleInjector />
        <TourModal
          message="Here you can provide details of your booking. Try booking a Private Roll-up."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  if (step === 4) {
    return (
      <>
        <StyleInjector />
        <TourModal
          message="Great, now you can submit your request. If your club has set bookings to auto-approve, your booking will be confirmed automatically. If your club has opted for a Club Admin or Secretary to approve bookings, they will be notified of your booking. For this example, the booking is automatically approved."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 5: Drag booking to Rink 2 @ 9am ────────────────────────────────
  if (step === 5) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={slot2Rect} color="#3b82f6" bgColor="rgba(59,130,246,0.18)" />
        <TourModal
          message="Great, your first rink has been booked! Now let's see if we can move your booking to another time. Drag and drop your booking into the highlighted free slot."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 6: Move confirmation ────────────────────────────────────────────
  if (step === 6) {
    return (
      <>
        <StyleInjector />
        <TourModal
          message="Nice! So now your original booking for 9am on Rink 1 has been moved to 9am on Rink 2 - easy!"
          onNext={() => setStep(7)}
          nextLabel="Next"
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 7: Click booking to view details ────────────────────────────────
  if (step === 7) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={tourBookingRect} />
        <TourModal
          message="Click your booking to view the details."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 8: Cancel booking button ────────────────────────────────────────
  if (step === 8) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={cancelBtnRect} color="#ef4444" bgColor="rgba(239,68,68,0.15)" />
        <TourModal
          message="To cancel a booking just click the 'Cancel Booking' button."
          onNext={() => setStep(9)}
          nextLabel="Next"
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 9: Select double session ────────────────────────────────────────
  if (step === 9) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={slot1Rect} />
        <HighlightRing rect={slot1_10Rect} />
        <TourModal
          message="For longer games, like County or National competitions, double sessions can be booked on the same rink. Click both the Rink 1 9am and 10am sessions to try this. Notice how the Book button shows 'Book 2 Slots' now."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 10: Highlight "Book 2 Slots" button ─────────────────────────────
  if (step === 10) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={bookBtnRect} />
        <TourModal
          message="Now click 'Book 2 Slots' to continue."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 11: Double booking modal – submit ────────────────────────────────
  if (step === 11) {
    return (
      <>
        <StyleInjector />
        <TourModal
          message="Submit your booking request for multiple sessions."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 12: Navigate to My Bookings (no button — nav-triggered) ──────────
  if (step === 12) {
    return (
      <>
        <StyleInjector />
        <HighlightRing rect={navRinkRect} color="#8b5cf6" bgColor="rgba(139,92,246,0.15)" />
        <TourModal
          message="Now let's look at the 'My Bookings' section. Click 'Rink Booking' in the navigation, then select 'My Bookings'."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  return null;
}