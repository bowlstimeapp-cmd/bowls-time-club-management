import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { HighlightRing, TourModal, dismissTour } from './NewUserTour';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Eye } from 'lucide-react';

const FLASH_STYLE = `
  @keyframes tourFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

// Demo match for the Selection tour step
function buildDemoSelection(userEmail, userName) {
  return {
    id: 'tour-selection',
    competition: 'Friendly',
    match_date: '2026-05-10',
    match_name: 'vs Atherley Bowling Club',
    status: 'published',
    selections: {
      // Rink 1 - Lead position = current user
      'rink_1_lead': userEmail,
      'rink_1_second': 'alice@example.com',
      'rink_1_third': 'bob@example.com',
      'rink_1_skip': 'charlie@example.com',
      // Rink 2
      'rink_2_lead': 'diana@example.com',
      'rink_2_second': 'edward@example.com',
      'rink_2_third': 'fiona@example.com',
      'rink_2_skip': 'george@example.com',
    },
  };
}

function DemoSelectionCard({ selection, cardRef, viewBtnRef }) {
  const playerCount = Object.values(selection.selections || {}).filter(Boolean).length;
  return (
    <div ref={cardRef} className="relative">
      <Card className="hover:shadow-md transition-shadow border-2 border-indigo-400 bg-indigo-50/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="border bg-blue-100 text-blue-800 border-blue-200">
                  <Trophy className="w-3 h-3 mr-1" />
                  {selection.competition}
                </Badge>
                <Badge variant="default">Published</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  10 May 2026
                </span>
                <span className="font-medium">{selection.match_name}</span>
              </div>
              <p className="text-sm text-gray-500">{playerCount} players selected</p>
            </div>
            <div className="flex gap-2">
              <button
                ref={viewBtnRef}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Tour overlay for the Selection page.
 * Handles steps 16 (nav highlight) and 17 (demo card).
 */
export default function SelectionTour({
  step,
  setStep,
  onDismiss,
  onComplete,
  userEmail,
  userName,
}) {
  const [navSelectionRect, setNavSelectionRect] = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [viewBtnRect, setViewBtnRect] = useState(null);
  const cardRef = React.useRef(null);
  const viewBtnRef = React.useRef(null);

  const demoSelection = buildDemoSelection(userEmail, userName);

  // Measure nav Selection link
  useEffect(() => {
    const measure = () => {
      // Find "Selection" nav link
      const allLinks = document.querySelectorAll('nav a, header a, nav button, header button');
      for (const el of allLinks) {
        const text = el.textContent?.trim();
        if (text === 'Selection') {
          setNavSelectionRect(el.getBoundingClientRect());
          break;
        }
      }
      if (cardRef.current) setCardRect(cardRef.current.getBoundingClientRect());
      if (viewBtnRef.current) setViewBtnRect(viewBtnRef.current.getBoundingClientRect());
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
  }, [step]);

  const handleDismiss = async () => {
    await dismissTour();
    onDismiss();
  };

  const handleFinish = async () => {
    await dismissTour();
    onComplete();
  };

  // ── Step 16: Highlight Selection nav ─────────────────────────────────────
  if (step === 16) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <HighlightRing rect={navSelectionRect} color="#6366f1" bgColor="rgba(99,102,241,0.15)" />
        <TourModal
          message="Selection - click the highlighted Selection link in the navigation bar."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 17: Demo selection card + View button highlight ─────────────────
  if (step === 17) {
    return (
      <>
        <style>{FLASH_STYLE}</style>

        {/* Demo card injected at top of published selections */}
        <div className="fixed inset-0 z-[9020] pointer-events-none" />
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9030] pointer-events-auto"
          style={{ top: '180px', width: 'min(600px, calc(100vw - 2rem))' }}
        >
          <DemoSelectionCard
            selection={demoSelection}
            cardRef={cardRef}
            viewBtnRef={viewBtnRef}
          />
        </div>

        <HighlightRing rect={cardRect} color="#6366f1" bgColor="rgba(99,102,241,0.08)" />
        <HighlightRing rect={viewBtnRect} color="#10b981" bgColor="rgba(16,185,129,0.18)" />

        <TourModal
          message="Here you can see what matches have been arranged by your club. Click the 'View' button to see the selection."
          onDismiss={handleDismiss}
          extraButtons={
            <Button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
              size="sm"
            >
              Finish Tour 🎉
            </Button>
          }
        />
      </>
    );
  }

  return null;
}