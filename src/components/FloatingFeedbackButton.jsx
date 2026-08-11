import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function FloatingFeedbackButton() {
  return (
    <>
      <a
        href="https://www.bowls-time.com/helpcentre"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex fixed bottom-[5.5rem] right-6 z-50 items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="font-medium">Help Centre</span>
      </a>
      <Link
        to={createPageUrl('Feedback')}
        className="hidden sm:flex fixed bottom-6 right-6 z-50 items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium">Feedback</span>
      </Link>
    </>
  );
}