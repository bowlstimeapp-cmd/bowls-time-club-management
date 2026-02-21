import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, ExternalLink, X } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

export default function LiveMatchBanner({ clubId }) {
  const [dismissed, setDismissed] = React.useState(false);

  const { data: liveMatches = [] } = useQuery({
    queryKey: ['liveMatches', clubId],
    queryFn: async () => {
      if (!clubId) return [];
      
      // Get all published selections for today
      const allSelections = await base44.entities.TeamSelection.filter({
        club_id: clubId,
        status: 'published'
      });
      
      // Filter to matches happening today
      return allSelections.filter(selection => {
        if (!selection.match_date) return false;
        return isToday(parseISO(selection.match_date));
      });
    },
    enabled: !!clubId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (!clubId || liveMatches.length === 0 || dismissed) return null;

  if (liveMatches.length === 1) {
    const match = liveMatches[0];
    const matchDisplay = `${match.competition}${match.match_name ? ' - ' + match.match_name : ''}`;
    
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg relative"
        >
          <Link
            to={createPageUrl('LiveScoring') + `?clubId=${clubId}&selectionId=${match.id}`}
            className="block py-3 px-4 hover:bg-emerald-800 transition-colors"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 animate-pulse" />
                  <span className="font-semibold">LIVE NOW:</span>
                </div>
                <span className="font-medium">{matchDisplay} is in progress</span>
                <ExternalLink className="w-4 h-4" />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDismissed(true);
                }}
                className="p-1 hover:bg-emerald-900 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Multiple matches
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg relative"
      >
        <div className="py-3 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 animate-pulse" />
                <span className="font-semibold">
                  {liveMatches.length} MATCHES LIVE NOW: {liveMatches.map(m => m.competition).join(', ')}
                </span>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-emerald-900 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {liveMatches.map(match => (
                <Link
                  key={match.id}
                  to={createPageUrl('LiveScoring') + `?clubId=${clubId}&selectionId=${match.id}`}
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  View {match.competition} Live Scoring
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}