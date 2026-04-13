import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

// Tour date: 1st Jan 2999
export const TOUR_DATE = new Date(2999, 0, 1);
export const TOUR_DATE_STRING = '2999-01-01';

// Check if the platform tour is enabled
export function isTourEnabled() {
  try {
    return localStorage.getItem('bowlstime_tour_enabled') === 'true';
  } catch {
    return false;
  }
}

// Check if user has already completed/dismissed
export async function hasTourBeenDismissed(user) {
  return !!(user?.tour_completed);
}

// Mark tour as completed/dismissed
export async function dismissTour() {
  await base44.auth.updateMe({ tour_completed: true });
}

// Step modal panel (right-aligned)
function TourModal({ title, message, onNext, nextLabel = 'Next', onDismiss, showDismiss = true }) {
  return (
    <div
      className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[9100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto"
    >
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
          <Button
            onClick={onNext}
            className="bg-emerald-600 hover:bg-emerald-700 text-sm"
            size="sm"
          >
            {nextLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────
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
          <Button
            onClick={onStart}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Book my first rink
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tour Component ──────────────────────────────────────────────────────
/**
 * Props:
 *   user              – current user object
 *   onDismiss         – called when tour is permanently dismissed
 *   onTourDateChange  – (date) => void  – set booking date to tour date
 *   onTourBooking     – (booking) => void – create a temp booking in parent state
 *   onTourMoveBooking – (booking, rink, time) => void – move temp booking
 *   tourBooking       – current temp booking (null initially)
 *   onComplete        – called when tour finishes
 *   bookButtonRef     – ref to the "Book N Slot" button
 *   slot1Ref          – ref to rink-1 9am slot cell
 *   slot2Ref          – ref to rink-2 9am slot cell
 *   step              – current step (0=welcome, 1=select, 2=book, 3=move, 4=done)
 *   setStep           – step setter
 */
export default function NewUserTour({
  user,
  onDismiss,
  onTourDateChange,
  onTourBooking,
  onTourMoveBooking,
  tourBooking,
  onComplete,
  bookButtonRef,
  slot1Ref,
  slot2Ref,
  step,
  setStep,
}) {
  const [slot1Rect, setSlot1Rect] = useState(null);
  const [slot2Rect, setSlot2Rect] = useState(null);
  const [bookBtnRect, setBookBtnRect] = useState(null);

  // Measure rects every time step changes
  useEffect(() => {
    const measure = () => {
      if (slot1Ref?.current) setSlot1Rect(slot1Ref.current.getBoundingClientRect());
      if (slot2Ref?.current) setSlot2Rect(slot2Ref.current.getBoundingClientRect());
      if (bookButtonRef?.current) setBookBtnRect(bookButtonRef.current.getBoundingClientRect());
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, slot1Ref, slot2Ref, bookButtonRef]);

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
          onStart={() => {
            onTourDateChange(TOUR_DATE);
            setStep(1);
          }}
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 1: Select rink 1 at 9am
  if (step === 1) {
    return (
      <>
        {/* Highlight layer - no pointer blocking */}
        <div className="fixed inset-0 z-[9001] pointer-events-none" style={{ background: 'transparent' }}>
          {/* We place a transparent "pass-through" over the slot */}
          {slot1Rect && (
            <div
              style={{
                position: 'fixed',
                top: slot1Rect.top - 4,
                left: slot1Rect.left - 4,
                width: slot1Rect.width + 8,
                height: slot1Rect.height + 8,
                pointerEvents: 'none',
                zIndex: 9010,
                border: '2px dashed #10b981',
                borderRadius: 12,
                animation: 'pulse 1.5s infinite',
                boxShadow: '0 0 0 4px rgba(16,185,129,0.2)',
              }}
            />
          )}
        </div>
        {/* The background dims but we set pointer-events to block only areas outside slot */}
        {slot1Rect && (
          <div
            style={{
              position: 'fixed',
              top: slot1Rect.top - 4,
              left: slot1Rect.left - 4,
              width: slot1Rect.width + 8,
              height: slot1Rect.height + 8,
              zIndex: 9005,
              pointerEvents: 'none', // allows clicks to pass through to the real button
            }}
          />
        )}
        <TourModal
          message="To choose a session to book, click a rink on a time where a booking doesn't already exist. For the example, choose the highlighted session."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 2: Book 1 slot
  if (step === 2) {
    return (
      <>
        {bookBtnRect && (
          <div
            style={{
              position: 'fixed',
              top: bookBtnRect.top - 4,
              left: bookBtnRect.left - 4,
              width: bookBtnRect.width + 8,
              height: bookBtnRect.height + 8,
              zIndex: 9010,
              border: '2px dashed #10b981',
              borderRadius: 10,
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 0 4px rgba(16,185,129,0.2)',
              pointerEvents: 'none',
            }}
          />
        )}
        <TourModal
          message='Click the "Book 1 Slot" button to book the selected rink.'
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 3: Move booking (drag to rink 2)
  if (step === 3) {
    return (
      <>
        {slot2Rect && (
          <div
            style={{
              position: 'fixed',
              top: slot2Rect.top - 4,
              left: slot2Rect.left - 4,
              width: slot2Rect.width + 8,
              height: slot2Rect.height + 8,
              zIndex: 9010,
              border: '2px dashed #3b82f6',
              borderRadius: 12,
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 0 4px rgba(59,130,246,0.2)',
              pointerEvents: 'none',
            }}
          />
        )}
        <TourModal
          message="Great, your first rink has been booked! Now let's see if we can move your booking to another time. Drag and drop your booking into the highlighted free slot."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // Step 4: Confirmation
  if (step === 4) {
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
              So now your original booking for 9am on Rink 1 has been moved to 9am on Rink 2 — easy!
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={async () => {
                  await dismissTour();
                  onComplete();
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
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