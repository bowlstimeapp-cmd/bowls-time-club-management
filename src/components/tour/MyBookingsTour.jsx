import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { HighlightRing, TourModal, dismissTour, pauseTour, clearTourPause, TOUR_DATE_STRING } from './NewUserTour';

// ─── Keyframe injection ────────────────────────────────────────────────────
const FLASH_STYLE = `
  @keyframes tourFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

/**
 * Tour overlay for the MyBookings page.
 * Handles steps 13, 14, 15.
 *
 * Props:
 *  step / setStep          – shared tour step
 *  onDismiss               – permanently dismiss (marks complete)
 *  onContinueLater         – pause tour, navigate away
 *  onContinueTour          – advance to Selection section (step 16)
 *  pastTabRef              – ref to the Past & Cancelled tab trigger
 *  activeTab               – current tab value ('upcoming'|'past')
 *  tourUpcomingBookings    – the temp tour bookings from step 11 (double session)
 *  tourCancelledBooking    – the cancelled booking from step 8
 */
export default function MyBookingsTour({
  step,
  setStep,
  onDismiss,
  onContinueLater,
  onContinueTour,
  pastTabRef,
  activeTab,
}) {
  const [pastTabRect, setPastTabRect] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (pastTabRef?.current) {
        setPastTabRect(pastTabRef.current.getBoundingClientRect());
      }
    };
    measure();
    const t = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, pastTabRef, activeTab]);

  // Detect when user clicks Past & Cancelled tab → advance to step 15
  useEffect(() => {
    if (step === 14 && activeTab === 'past') {
      setStep(15);
    }
  }, [activeTab, step, setStep]);

  const handleDismiss = async () => {
    await dismissTour();
    onDismiss();
  };

  // ── Step 13: Upcoming tab – explain booking tags ─────────────────────────
  if (step === 13) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <TourModal
          message="Here you will see all upcoming bookings. Depending on your club's settings, you will either see an 'approved' tag or a 'requested' tag on the booking."
          onNext={() => setStep(14)}
          nextLabel="Next"
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 14: Highlight Past & Cancelled tab ──────────────────────────────
  if (step === 14) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <HighlightRing rect={pastTabRect} color="#6366f1" bgColor="rgba(99,102,241,0.15)" />
        <TourModal
          message="Past bookings and cancelled bookings appear here."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 15: Past tab – show cancelled booking, Continue/Later ───────────
  if (step === 15) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <TourModal
          message="Here's the cancelled booking from earlier in the New User Tour. That finishes the tour of the Rink Bookings system, but there's plenty more to see in Bowls Time. How about we look at where to find the selection for Club Representative matches in the Selection screen. Don't worry, if you don't have time, we can always pick this up again later."
          onDismiss={handleDismiss}
          extraButtons={
            <>
              <Button
                onClick={onContinueTour}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
                size="sm"
              >
                Continue Tour
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <Button
                variant="outline"
                className="text-sm w-full"
                size="sm"
                onClick={onContinueLater}
              >
                Continue Later
              </Button>
            </>
          }
        />
      </>
    );
  }

  return null;
}