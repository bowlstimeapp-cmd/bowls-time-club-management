import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMEOUT_MS = 120_000; // 2 minutes
const WARNING_AT_MS = 90_000; // warn at 90s (30s before timeout)

export default function KioskSessionWrapper({ kioskMember, onLogout, children }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(30);

    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(30);
      let c = 30;
      countdownRef.current = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }, WARNING_AT_MS);

    timeoutRef.current = setTimeout(() => {
      onLogout();
    }, TIMEOUT_MS);
  }, [onLogout]);

  useEffect(() => {
    resetTimer();
    const events = ['click', 'touchstart', 'keydown', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer, true));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer, true));
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  return (
    <div className="relative min-h-screen">
      {/* Logout bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white flex items-center justify-between px-6 py-3">
        <span className="text-lg font-semibold">
          Logged in as: <span className="font-bold">{kioskMember.name}</span>
        </span>
        <Button
          onClick={onLogout}
          className="bg-white text-red-600 hover:bg-red-50 font-bold text-base px-6 py-2 h-auto"
        >
          <LogOut className="w-5 h-5 mr-2" />
          End Session
        </Button>
      </div>

      {/* Content offset for the top bar */}
      <div className="pt-14">
        {children}
      </div>

      {/* Inactivity warning overlay */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6"
            onClick={resetTimer}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl font-bold text-red-600 mb-4">{countdown}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Still there?</h2>
              <p className="text-gray-600 text-lg mb-6">
                Your session will end in {countdown} seconds due to inactivity.
              </p>
              <Button
                onClick={resetTimer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-4 h-auto w-full rounded-2xl"
              >
                Tap anywhere to continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}