import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

// Tour date: 1st Jan 2999
export const TOUR_DATE = new Date(2999, 0, 1);
export const TOUR_DATE_STRING = '2999-01-01';

// Tour is always enabled by default for all users
export function isTourEnabled() {
  return true;
}

// Check if user has already completed/dismissed
export async function hasTourBeenDismissed(user) {
  return !!(user?.tour_completed);
}

// Mark tour as permanently dismissed
export async function dismissTour() {
  await base44.auth.updateMe({ tour_completed: true });
}

// Step modal panel (right-aligned)
function TourModal({ title, message, onNext, nextLabel = 'Next', onDismiss, showDismiss = true }) {
  return (
    <div className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[9100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto">
      {showDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xs underline leading-none"
        >
          Close the New User Tour and do not show again
        </button>
      )}
      <div className="mt-6">
        {title && <p className="font-semibold text-gray-900 mb-2 text-sm">{title}</p>}
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      </div>
      {onNext && (
        <div className="mt-5 flex justify-end">
          <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700 text-sm" size="sm">
            {nextLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function WelcomeModal({ onStart, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-lg mx-4 pointer-events-auto relative">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xs underline leading-none"
        >
          Close the New User Tour and do not show again
        </button>
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
      </div>
    </div>
  );
}

// Highlight ring helper — dashed border with flashing background fill
function HighlightRing({ rect, color = '#10b981', bgColor = 'rgba(16,185,129,0.18)', shadowColor = 'rgba(16,185,129,0.2)' }) {
  if (!rect) return null;
  return (
    <>
      <style>{`
        @keyframes tourFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          zIndex: 9050,
          border: `2px solid ${color}`,
          borderRadius: 10,
          backgroundColor: bgColor,
          boxShadow: `0 0 0 4px ${shadowColor}`,
          pointerEvents: 'none',
          animation: 'tourFlash 1s ease-in-out infinite',
        }}
      />
    </>
  );
}

/**
 * Steps:
 *  0  – Welcome
 *  1  – Select rink 1 @ 9am
 *  2  – Booking modal open (sub: 'select' | 'submit')
 *  3  – Drag booking to rink 2 @ 9am
 *  4  – Click the booking to view details
 *  5  – Cancel booking (view details modal open)
 *  6  – Select double session (rink1 9am + 10am)
 *  7  – Click "Book 2 Slots"
 *  8  – Double booking modal open (sub: 'submit')
 *  9  – Navigate to My Bookings
 *  10 – Completion
 */
export default function NewUserTour({
  user,
  onDismiss,
  onTourDateChange,
  tourBooking,
  tourBooking2, // second tour booking (double session)
  onComplete,
  bookButtonRef,
  slot1Ref,
  slot2Ref,
  slot1_10Ref,   // rink 1 @ 10:00
  tourBookingRef, // ref to the tour booking cell (rink1@9am after it's booked)
  bookingDetailCancelRef, // ref to "Cancel Booking" button inside detail modal
  step,
  setStep,
  hasSlotSelected, // true when a slot is currently selected (to trigger book button measurement)
  // callbacks
  onTourBookingModalOpen,   // () => void – tell parent to show tour booking modal
  onTourBookingModalClose,  // () => void
  onTourBookingConfirm,     // (competitionType) => void – create temp booking
  onTourBookingModalOpen2,  // for double session modal
  onTourBookingConfirm2,    // create temp double bookings
  tourModalSubStep,         // 'select' | 'submit' for booking modal
  setTourModalSubStep,
}) {
  const [slot1Rect, setSlot1Rect] = useState(null);
  const [slot2Rect, setSlot2Rect] = useState(null);
  const [slot1_10Rect, setSlot1_10Rect] = useState(null);
  const [bookBtnRect, setBookBtnRect] = useState(null);

  // Clear book button rect when entering step 1 so it only shows after slot is selected
  useEffect(() => {
    if (step === 1 && !hasSlotSelected) setBookBtnRect(null);
  }, [step, hasSlotSelected]);
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
      // Find the "Rink Booking" nav button by text content
      const navButtons = document.querySelectorAll('nav button, header button');
      for (const btn of navButtons) {
        if (btn.textContent?.includes('Rink Booking')) {
          setNavRinkRect(btn.getBoundingClientRect());
          break;
        }
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, hasSlotSelected, slot1Ref, slot2Ref, slot1_10Ref, bookButtonRef, tourBookingRef, bookingDetailCancelRef]);

  const handleDismiss = async () => {
    await dismissTour();
    onDismiss();
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <>
        <div className="fixed inset-0 z-[9000] bg-black/40 pointer-events-none" />
        <WelcomeModal
          onStart={() => { onTourDateChange(TOUR_DATE); setStep(1); }}
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 1: Select rink 1 @ 9am — once selected, also highlight the Book button
  if (step === 1) {
    return (
      <>
        {!hasSlotSelected && <HighlightRing rect={slot1Rect} />}
        {hasSlotSelected && bookBtnRect && (
          <HighlightRing rect={bookBtnRect} color="#059669" bgColor="rgba(5,150,105,0.22)" shadowColor="rgba(5,150,105,0.25)" />
        )}
        <TourModal
          message={hasSlotSelected
            ? "Great! Now click the 'Book 1 Slot' button to continue."
            : "To choose a session to book, click a rink on a time where a booking doesn't already exist. For the example, choose the highlighted session."}
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 2: Booking modal guidance (handled by TourBookingModal in parent, we just show the side panel)
  if (step === 2) {
    return (
      <TourModal
        message={
          tourModalSubStep === 'submit'
            ? "Great, now you can submit your request. If your club has set bookings to auto-approve, your booking will be confirmed automatically. If your club has opted for a Club Admin or Secretary to approve bookings, they will be notified of your booking. For this example, the booking is automatically approved."
            : "Here you can provide details of your booking. Try booking a Private Roll-up."
        }
        onDismiss={handleDismiss}
      />
    );
  }

  // Step 3: Drag booking to rink 2 @ 9am
  if (step === 3) {
    return (
      <>
        <HighlightRing rect={slot2Rect} color="#3b82f6" shadowColor="rgba(59,130,246,0.2)" />
        <TourModal
          message="Great, your first rink has been booked! Now let's see if we can move your booking to another time. Drag and drop your booking into the highlighted free slot."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 4: Click the booking to view details
  if (step === 4) {
    return (
      <>
        <HighlightRing rect={tourBookingRect} />
        <TourModal
          message="Click your booking to view the details."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 5: Booking details open – highlight cancel button
  if (step === 5) {
    return (
      <>
        <HighlightRing rect={cancelBtnRect} color="#ef4444" shadowColor="rgba(239,68,68,0.2)" />
        <TourModal
          message="To cancel a booking just click the 'Cancel Booking' button."
          onNext={() => setStep(6)}
          nextLabel="Next"
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 6: Select double session (rink 1 @ 9am + 10am)
  if (step === 6) {
    return (
      <>
        <HighlightRing rect={slot1Rect} />
        <HighlightRing rect={slot1_10Rect} />
        <TourModal
          message="For longer games, like County or National competitions, double sessions can be booked on the same rink. Click both the Rink 1 9am and 10am sessions to try this. Notice how the Book button shows 'Book 2 Slots' now."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 7: Click "Book 2 Slots"
  if (step === 7) {
    return (
      <>
        <HighlightRing rect={bookBtnRect} />
        <TourModal
          message="Now click 'Book 2 Slots' to continue."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 8: Double booking modal – submit
  if (step === 8) {
    return (
      <TourModal
        message="Submit your booking request for multiple sessions."
        onDismiss={handleDismiss}
      />
    );
  }

  // Step 9: Navigate to My Bookings
  if (step === 9) {
    return (
      <>
        <HighlightRing rect={navRinkRect} />
        <TourModal
          message="Now let's look at the 'My Bookings' section. Click 'Rink Booking' in the navigation, then select 'My Bookings'."
          onNext={() => setStep(10)}
          nextLabel="Skip"
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 10: Completion
  if (step === 10) {
    return (
      <>
        <div className="fixed inset-0 z-[9000] bg-black/40 pointer-events-none" />
        <div className="fixed inset-0 z-[9100] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md mx-4 pointer-events-auto text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Nice work!</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You've completed the tour! You now know how to book a rink, move a booking, and navigate to your bookings. Enjoy using BowlsTime!
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-700">
                Finish Tour
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}