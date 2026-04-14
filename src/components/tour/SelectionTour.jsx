import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Eye, Users, CheckCircle, XCircle, User, ArrowLeft, ClipboardList, ExternalLink } from 'lucide-react';
import { HighlightRing, TourModal, dismissTour, pauseTour } from './NewUserTour';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const FLASH_STYLE = `
  @keyframes tourFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

const competitionColors = {
  'Bramley': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Wessex League': 'bg-blue-100 text-blue-800 border-blue-200',
  'Denny': 'bg-purple-100 text-purple-800 border-purple-200',
  'Top Club': 'bg-amber-100 text-amber-800 border-amber-200',
  'Friendly': 'bg-blue-100 text-blue-800 border-blue-200',
};

// Demo match data — keys match SelectionView format: rink{n}_{Position}
function buildDemoSelection(userEmail, userName) {
  return {
    id: 'tour-selection',
    competition: 'Friendly',
    match_date: '2026-05-10',
    match_name: 'vs Atherley Bowling Club',
    status: 'published',
    home_rinks: 2,
    selections: {
      'rink1_Lead': userEmail,
      'rink1_2': 'alice@example.com',
      'rink1_3': 'bob@example.com',
      'rink1_Skip': 'charlie@example.com',
      'rink2_Lead': 'diana@example.com',
      'rink2_2': 'edward@example.com',
      'rink2_3': 'fiona@example.com',
      'rink2_Skip': 'george@example.com',
    },
  };
}

const DEMO_MEMBER_NAMES = {
  'alice@example.com': 'Alice Brown',
  'bob@example.com': 'Bob Smith',
  'charlie@example.com': 'Charlie Jones',
  'diana@example.com': 'Diana White',
  'edward@example.com': 'Edward Taylor',
  'fiona@example.com': 'Fiona Green',
  'george@example.com': 'George Black',
};

// ── Fake Live Match Banner (tour only) ───────────────────────────────────────
function TourLiveBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg">
      <div className="py-3 px-4 max-w-7xl mx-auto flex items-center gap-3">
        <Trophy className="w-5 h-5 animate-pulse shrink-0" />
        <span className="font-semibold">LIVE NOW:</span>
        <span className="font-medium">Friendly - vs Atherley Bowling Club is in progress</span>
        <ExternalLink className="w-4 h-4 shrink-0" />
      </div>
    </div>
  );
}

// ── Tour Selection View Overlay (Step 18) ────────────────────────────────────
function TourSelectionView({ selection, userEmail, userName, availBtnRef, unavailBtnRef, onAvailabilitySet }) {
  const [myAvailability, setMyAvailability] = useState(null);

  const getMemberName = (email) => {
    if (!email) return 'TBD';
    if (email === userEmail) return userName;
    return DEMO_MEMBER_NAMES[email] || email;
  };

  const dynamicRinks = [
    { number: 1, tag: 'Home' },
    { number: 2, tag: 'Home' },
  ];
  const rinkPositions = ['Lead', '2', '3', 'Skip'];
  const selections = selection.selections || {};

  const handleAvailabilityClick = (val) => {
    setMyAvailability(val);
    onAvailabilitySet?.();
  };

  return (
    <div className="fixed inset-0 z-[9010] bg-gradient-to-br from-emerald-50 via-white to-emerald-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Back link (non-functional in tour) */}
          <span className="inline-flex items-center text-gray-600 mb-4 cursor-default">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </span>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`border text-base px-3 py-1 ${competitionColors[selection.competition]}`}>
                  <Trophy className="w-4 h-4 mr-2" />
                  {selection.competition}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selection.match_name}
              </h1>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                Sunday, 10 May 2026
              </p>
            </div>
            {/* Availability buttons — highlighted by tour */}
            <div className="flex gap-2">
              <Button
                ref={availBtnRef}
                size="sm"
                variant={myAvailability === true ? 'default' : 'outline'}
                className={myAvailability === true ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => handleAvailabilityClick(true)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Available
              </Button>
              <Button
                ref={unavailBtnRef}
                size="sm"
                variant={myAvailability === false ? 'destructive' : 'outline'}
                onClick={() => handleAvailabilityClick(false)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Unavailable
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dynamicRinks.map(rink => (
              <Card key={rink.number}>
                <CardHeader className="bg-emerald-50 py-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Rink {rink.number}
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {rink.tag}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {rinkPositions.map(position => {
                      const positionKey = `rink${rink.number}_${position}`;
                      const memberEmail = selections[positionKey];
                      const isMe = memberEmail === userEmail;
                      const availability = isMe ? myAvailability : null;
                      return (
                        <div key={position} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm font-medium text-gray-500 w-12">{position}</span>
                          <span className={cn("font-medium flex items-center gap-2", isMe && "text-emerald-700 font-semibold")}>
                            {availability === true ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : availability === false ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                            {getMemberName(memberEmail)}
                            {isMe && <span className="text-xs text-emerald-600 font-normal">(You)</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Tour overlay for the Selection page.
 * Steps:
 *   16 — highlight Selection nav (auto-advances)
 *   17 — demo SelectionCard injected; highlight card + View btn
 *   18 — SelectionView overlay with Available/Unavailable; after clicking → modal changes
 *   18b— post-availability modal: "now let's look at Live Scoring"
 *   19 — back on Selection page: fake live banner + highlight Live Scoring btn
 *   20 — after clicking Live Scoring: final modal + Finish Tour
 */
export default function SelectionTour({
  step,
  setStep,
  onDismiss,
  onComplete,
  userEmail,
  userName,
  // Refs passed from Selection.jsx
  demoCardRef,
  demoViewBtnRef,
  liveScoreBtnRef,
}) {
  const [navSelectionRect, setNavSelectionRect] = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [viewBtnRect, setViewBtnRect] = useState(null);
  const [availBtnRect, setAvailBtnRect] = useState(null);
  const [unavailBtnRect, setUnavailBtnRect] = useState(null);
  const [liveScoreRect, setLiveScoreRect] = useState(null);
  const [availabilityClicked, setAvailabilityClicked] = useState(false);

  const availBtnRef = useRef(null);
  const unavailBtnRef = useRef(null);

  const demoSelection = buildDemoSelection(userEmail, userName);

  // Measure elements
  useEffect(() => {
    const measure = () => {
      const allLinks = document.querySelectorAll('nav a, header a, nav button, header button');
      for (const el of allLinks) {
        if (el.textContent?.trim() === 'Selection') {
          setNavSelectionRect(el.getBoundingClientRect());
          break;
        }
      }
      if (demoCardRef?.current) setCardRect(demoCardRef.current.getBoundingClientRect());
      if (demoViewBtnRef?.current) setViewBtnRect(demoViewBtnRef.current.getBoundingClientRect());
      if (availBtnRef.current) setAvailBtnRect(availBtnRef.current.getBoundingClientRect());
      if (unavailBtnRef.current) setUnavailBtnRect(unavailBtnRef.current.getBoundingClientRect());
      if (liveScoreBtnRef?.current) setLiveScoreRect(liveScoreBtnRef.current.getBoundingClientRect());
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
  }, [step, demoCardRef, demoViewBtnRef, liveScoreBtnRef, availabilityClicked]);

  const handleDismiss = async () => {
    await dismissTour();
    onDismiss();
  };

  const handleContinueLater = () => {
    pauseTour(17);
    onDismiss();
  };

  const handleFinish = async () => {
    await dismissTour();
    onComplete();
  };

  // ── Step 16: Highlight Selection nav ────────────────────────────────────
  if (step === 16) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <HighlightRing rect={navSelectionRect} color="#6366f1" bgColor="rgba(99,102,241,0.15)" />
        <TourModal
          message="Now let's look at the Selection page — click the highlighted Selection link in the navigation bar."
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  // ── Step 17: Demo card with View button highlight ────────────────────────
  if (step === 17) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <HighlightRing rect={cardRect} color="#6366f1" bgColor="rgba(99,102,241,0.08)" />
        <HighlightRing rect={viewBtnRect} color="#10b981" bgColor="rgba(16,185,129,0.18)" />
        <TourModal
          message="Here you can see what matches have been arranged by your club. Click the 'View' button on the demo match to see the full selection."
          onDismiss={handleDismiss}
          extraButtons={
            <>
              <Button
                onClick={() => setStep(18)}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
                size="sm"
              >
                Continue Tour
              </Button>
              <Button
                variant="outline"
                onClick={handleContinueLater}
                className="text-sm w-full"
                size="sm"
              >
                Continue Later
              </Button>
            </>
          }
        />
      </>
    );
  }

  // ── Step 18: SelectionView overlay + availability highlights ─────────────
  if (step === 18) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <TourSelectionView
          selection={demoSelection}
          userEmail={userEmail}
          userName={userName}
          availBtnRef={availBtnRef}
          unavailBtnRef={unavailBtnRef}
          onAvailabilitySet={() => setAvailabilityClicked(true)}
        />
        {!availabilityClicked && (
          <>
            <HighlightRing rect={availBtnRect} color="#10b981" bgColor="rgba(16,185,129,0.18)" />
            <HighlightRing rect={unavailBtnRect} color="#ef4444" bgColor="rgba(239,68,68,0.15)" />
          </>
        )}
        <TourModal
          message={
            availabilityClicked
              ? "Now that seeing the selection and providing availability has been sorted, let's go back to the Selection page and look at the Live Scoring."
              : "Here you can see the players selected for the match, along with the match details. You can select whether you are available or unavailable, which will change the icon next to your name, and inform the Club Selectors of your availability status."
          }
          onDismiss={handleDismiss}
          extraButtons={
            availabilityClicked ? (
              <Button
                onClick={() => setStep(19)}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
                size="sm"
              >
                Continue Tour
              </Button>
            ) : null
          }
        />
      </>
    );
  }

  // ── Step 19: Back on Selection page — fake banner + highlight Live Scoring btn ──
  if (step === 19) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        {/* Fake live banner injected above the header */}
        <div className="fixed top-0 left-0 right-0 z-[9020]">
          <TourLiveBanner />
        </div>
        <HighlightRing rect={liveScoreRect} color="#10b981" bgColor="rgba(16,185,129,0.18)" />
        <TourModal
          message="When a game is in progress, you will see a banner across the top of the application showing what game is in progress, which when clicked takes you to the live scoring for that game. You can also access it through the Selection page and clicking 'Live Scoring' on that game you're interested in. Look, the banner is there now!"
          onDismiss={handleDismiss}
          extraButtons={
            <Button
              onClick={() => setStep(20)}
              className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
              size="sm"
            >
              Click Live Scoring
            </Button>
          }
        />
      </>
    );
  }

  // ── Step 20: Final modal + Finish Tour ────────────────────────────────────
  if (step === 20) {
    return (
      <>
        <style>{FLASH_STYLE}</style>
        <TourModal
          message="As mentioned, Live Scoring can be accessed easily to see how your team is getting on!"
          onDismiss={handleDismiss}
          extraButtons={
            <Button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-sm w-full"
              size="sm"
            >
              Finish Tour 🎳
            </Button>
          }
        />
      </>
    );
  }

  return null;
}