import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function FloatingFeedbackButton() {
  return (
    <Link
      to={createPageUrl('Feedback')}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
    >
      <MessageSquare className="w-5 h-5" />
      <span className="font-medium">Feedback</span>
    </Link>
  );
}