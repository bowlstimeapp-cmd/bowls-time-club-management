import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;   // visual pull (px) needed to trigger refresh
const MAX_PULL = 110;
const RESISTANCE = 0.45;

// Ignore pulls that start inside an inner scrollable area (dialogs, chat panes…)
function isInScrollableContainer(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const lastDy = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

    const onTouchStart = (e) => {
      if (scrollTop() > 0) return;
      if (isInScrollableContainer(e.target)) return;
      startY.current = e.touches[0].clientY;
      lastDy.current = 0;
      active.current = true;
    };

    const onTouchMove = (e) => {
      if (!active.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      lastDy.current = dy;
      if (dy <= 0 || scrollTop() > 0) {
        setPull(0);
        return;
      }
      e.preventDefault();
      setPull(Math.min(dy * RESISTANCE, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (lastDy.current * RESISTANCE >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        window.setTimeout(() => window.location.reload(), 400);
      } else {
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;

  return (
    <div
      className="fixed inset-x-0 z-[80] flex justify-center pointer-events-none"
      style={{ top: refreshing ? '72px' : `calc(64px + ${pull * 0.35}px)` }}
    >
      <div
        className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center"
        style={{ opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD) }}
      >
        <RefreshCw
          className={`w-4 h-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
        />
      </div>
    </div>
  );
}