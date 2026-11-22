import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Megaphone, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function resolveMessageLink(clubId, linkType, targetId) {
  if (!clubId || !linkType || linkType === 'none') return null;
  const base = (page) => createPageUrl(page) + `?clubId=${clubId}`;
  switch (linkType) {
    case 'fixtures':
      return base('ClubFixtures');
    case 'selection':
      return base('Selection');
    case 'selection_specific':
      return targetId ? base('SelectionView') + `&selectionId=${targetId}` : base('Selection');
    case 'competition_entries':
      return base('CompetitionRegistration');
    case 'competition_entry_specific':
      return targetId ? base('CompetitionRegistration') + `&competitionId=${targetId}` : base('CompetitionRegistration');
    case 'draw':
      return base('ClubTournaments');
    case 'draw_specific':
      return targetId ? base('TournamentView') + `&tournamentId=${targetId}` : base('ClubTournaments');
    default:
      return null;
  }
}

// Presentational bar — also used for the admin preview.
export function MessageOfTheDayBar({ message, to, onDismiss }) {
  const inner = (
    <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <Megaphone className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
        <span className="font-medium whitespace-pre-wrap break-words">{message}</span>
        {to && <ArrowRight className="w-4 h-4 shrink-0" />}
      </div>
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 hover:bg-black/20 rounded-full transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-amber-500 to-blue-600 text-white shadow-lg relative">
      {to ? (
        <Link to={to} className="block py-3 px-4 hover:brightness-110 transition-all">
          {inner}
        </Link>
      ) : (
        <div className="py-3 px-4">{inner}</div>
      )}
    </div>
  );
}

export default function MessageOfTheDayBanner({ clubId }) {
  const { data: record } = useQuery({
    queryKey: ['messageOfTheDay', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const records = await base44.entities.ClubMessageOfTheDay.filter({ club_id: clubId });
      return records[0] || null;
    },
    enabled: !!clubId,
    refetchInterval: 5 * 60 * 1000,
  });

  const storageKey = record ? `motd-dismissed-${record.id}-${record.message}` : null;
  const [dismissedKey, setDismissedKey] = useState(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (sessionStorage.getItem(storageKey) === '1') setDismissedKey(storageKey);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);

  if (!clubId || !record || !storageKey) return null;
  if (record.is_enabled === false) return null;
  if (!record.message || !record.message.trim()) return null;

  const today = format(new Date(), 'yyyy-MM-dd');
  if (record.start_date && today < record.start_date) return null;
  if (record.end_date && today > record.end_date) return null;

  if (dismissedKey === storageKey) return null;

  const to = resolveMessageLink(clubId, record.link_type, record.link_target_id);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}>
        <MessageOfTheDayBar
          message={record.message}
          to={to}
          onDismiss={() => {
            try {
              sessionStorage.setItem(storageKey, '1');
            } catch {
              /* storage unavailable */
            }
            setDismissedKey(storageKey);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}