import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { emptyScores, mergeVenueScores, venueOf, venuePayload, PLAYER_FIELDS, RESULT_FIELDS } from '@/components/scoring/venueScoreData';

export default function useVenueScores(selectionId, clubId, matches) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(emptyScores);
  const edits = useRef({ home: 0, away: 0 });
  const savedEdits = useRef({ home: 0, away: 0 });
  const playerEdits = useRef({ home: 0, away: 0 });
  const savedPlayerEdits = useRef({ home: 0, away: 0 });
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
    playerEdits.current = { home: 0, away: 0 };
    savedPlayerEdits.current = { home: 0, away: 0 };
    stamps.current = { home: null, away: null };
  }, [selectionId]);

  const applyScore = useCallback(score => {
    if (!score) return;
    setValues(current => {
      let next = current;
      for (const scope of ['home', 'away']) {
        const stamp = score[`${scope}_updated_date`];
        const latest = stamps.current[scope];
        if (latest && (!stamp || stamp < latest)) continue;
        // Never overwrite fields the person has typed but not yet saved
        const fields = [
          ...(edits.current[scope] === savedEdits.current[scope] ? RESULT_FIELDS : []),
          ...(playerEdits.current[scope] === savedPlayerEdits.current[scope] ? PLAYER_FIELDS : []),
        ];
        if (!fields.length) continue;
        if (stamp) stamps.current[scope] = stamp;
        next = mergeVenueScores(next, score, matches, scope, fields);
      }
      return next;
    });
  }, [matches]);

  useEffect(() => { applyScore(matchScore); }, [matchScore, applyScore]);
  useEffect(() => {
    if (!selectionId) return;
    return base44.entities.MatchScore.subscribe(event => {
      if (event.data?.selection_id === selectionId) applyScore(event.data);
    });
  }, [selectionId, applyScore]);

  const mutation = useMutation({
    mutationFn: ({ editRevision, playerRevision, kind, ...payload }) => base44.functions.invoke('saveMatchScore', payload),
    onSuccess: (result, variables) => {
      const saved = result.data;
      const scope = variables.scope;
      const stampField = `${scope}_updated_date`;
      const record = saved.record;
      if (variables.kind !== 'players') savedEdits.current[scope] = variables.editRevision;
      savedPlayerEdits.current[scope] = variables.playerRevision;
      stamps.current[scope] = saved[stampField] || record?.[stampField] || null;
      // Show exactly what the server stored, so the screen matches what a reload will show
      const savedFields = [
        ...(variables.kind !== 'players' && variables.editRevision === edits.current[scope] ? RESULT_FIELDS : []),
        ...(variables.playerRevision === playerEdits.current[scope] ? PLAYER_FIELDS : []),
      ];
      if (record) {
        queryClient.setQueryData(['matchScore', selectionId], record);
        if (savedFields.length) {
          setValues(current => mergeVenueScores(current, record, matches, scope, savedFields));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['matchScore', selectionId] });
      toast.success(variables.kind === 'players' ? 'Opposition players saved' : 'Scores saved');
    },
    onError: (_err, variables) => toast.error(variables?.kind === 'players' ? 'Failed to save player names' : 'Failed to save scores'),
  });

  const updateField = (field, key, value, scope) => {
    if (field === 'opposition_players') playerEdits.current[scope] += 1;
    else edits.current[scope] += 1;
    setValues(current => ({ ...current, [field]: { ...current[field], [key]: value } }));
  };
  const saveVenue = scope => {
    const keys = matches.filter(match => venueOf(match) === scope).map(match => match.key);
    if (!keys.length) return;
    mutation.mutate({
      selectionId, clubId, scope, match_keys: keys,
      ...venuePayload(values, matches, scope), editRevision: edits.current[scope],
      playerRevision: playerEdits.current[scope],
    });
  };
  // Saves just the opposition player names for a venue (used by the dedicated button)
  const hasUnsavedPlayers = scope => playerEdits.current[scope] !== savedPlayerEdits.current[scope];
  const savePlayers = scope => {
    const keys = matches.filter(match => venueOf(match) === scope).map(match => match.key);
    if (!keys.length) return;
    mutation.mutate({
      selectionId, clubId, scope, match_keys: keys, kind: 'players',
      ...venuePayload(values, matches, scope, PLAYER_FIELDS), playerRevision: playerEdits.current[scope],
    });
  };
  return {
    clubScores: values.club_scores, oppositionScores: values.opposition_scores,
    ends: values.ends, oppositionPlayers: values.opposition_players,
    updateField, saveVenue, savePlayers, hasUnsavedPlayers, isSaving: mutation.isPending || isLoading,
  };
}