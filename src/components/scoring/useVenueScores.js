import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { emptyScores, mergeVenueScores, venueOf, venuePayload } from '@/components/scoring/venueScoreData';

export default function useVenueScores(selectionId, clubId, matches) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(emptyScores);
  const edits = useRef({ home: 0, away: 0 });
  const savedEdits = useRef({ home: 0, away: 0 });
  const stamps = useRef({ home: null, away: null });
  const { data: matchScore, isLoading } = useQuery({
    queryKey: ['matchScore', selectionId],
    queryFn: async () => {
      const { items } = await base44.entities.MatchScore.filter({ selection_id: selectionId }, { limit: 1 });
      return items[0] || null;
    },
    enabled: !!selectionId,
  });

  useEffect(() => {
    setValues(emptyScores());
    edits.current = { home: 0, away: 0 };
    savedEdits.current = { home: 0, away: 0 };
    stamps.current = { home: null, away: null };
  }, [selectionId]);

  const applyScore = useCallback(score => {
    if (!score) return;
    const accepted = ['home', 'away'].filter(scope => {
      const stamp = score[`${scope}_updated_date`];
      const latest = stamps.current[scope];
      if (edits.current[scope] !== savedEdits.current[scope] || (latest && (!stamp || stamp < latest))) return false;
      if (stamp) stamps.current[scope] = stamp;
      return true;
    });
    if (accepted.length) setValues(current => accepted.reduce((next, scope) => mergeVenueScores(next, score, matches, scope), current));
  }, [matches]);

  useEffect(() => { applyScore(matchScore); }, [matchScore, applyScore]);
  useEffect(() => {
    if (!selectionId) return;
    return base44.entities.MatchScore.subscribe(event => {
      if (event.data?.selection_id === selectionId) applyScore(event.data);
    });
  }, [selectionId, applyScore]);

  const mutation = useMutation({
    mutationFn: ({ editRevision, ...payload }) => base44.functions.invoke('saveMatchScore', payload),
    onSuccess: (result, variables) => {
      const saved = result.data;
      const scope = variables.scope;
      const stampField = `${scope}_updated_date`;
      savedEdits.current[scope] = variables.editRevision;
      stamps.current[scope] = saved[stampField];
      queryClient.setQueryData(['matchScore', selectionId], old => ({
        ...mergeVenueScores(old || {}, variables, matches, scope),
        id: saved.id, selection_id: selectionId, club_id: clubId,
        [stampField]: saved[stampField],
      }));
      queryClient.invalidateQueries({ queryKey: ['matchScore', selectionId] });
      toast.success('Scores saved');
    },
    onError: () => toast.error('Failed to save scores'),
  });

  const updateField = (field, key, value, scope) => {
    edits.current[scope] += 1;
    setValues(current => ({ ...current, [field]: { ...current[field], [key]: value } }));
  };
  const saveVenue = scope => {
    const keys = matches.filter(match => venueOf(match) === scope).map(match => match.key);
    if (!keys.length) return;
    mutation.mutate({
      selectionId, clubId, scope, match_keys: keys,
      ...venuePayload(values, matches, scope), editRevision: edits.current[scope],
    });
  };
  return {
    clubScores: values.club_scores, oppositionScores: values.opposition_scores,
    ends: values.ends, oppositionPlayers: values.opposition_players,
    updateField, saveVenue, isSaving: mutation.isPending || isLoading,
  };
}