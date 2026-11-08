import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// The ONE source of truth for Competition data.
// ['competitions', clubId] is the only key for a club's competitions,
// ['platformCompetitions'] for the platform-wide ones.
const INVALIDATE_KEYS = ['competitions', 'clubCompetitions', 'platformCompetitions'];

const errorText = (e, fallback) =>
  e?.response?.data?.error || e?.data?.error || e?.message || fallback;

export default function useClubCompetitions(clubId) {
  const queryClient = useQueryClient();

  const clubQuery = useQuery({
    queryKey: ['competitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }, 'name', 200),
    enabled: !!clubId,
  });

  const platformQuery = useQuery({
    queryKey: ['platformCompetitions'],
    queryFn: async () => {
      const all = await base44.entities.Competition.list();
      return all.filter(c => !c.club_id);
    },
  });

  // The club can hide platform-wide competitions everywhere with one switch in Club Settings
  const clubSettingsQuery = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => (await base44.entities.Club.filter({ id: clubId }))[0],
    enabled: !!clubId,
  });
  const showPlatformCompetitions = clubSettingsQuery.data?.show_platform_competitions !== false;

  const invalidateAll = () => {
    INVALIDATE_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const createCompetition = useMutation({
    mutationFn: (data) =>
      base44.functions.invoke('updateClubData', { entity: 'Competition', action: 'create', clubId, data }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Competition created');
    },
    onError: (e) => toast.error(errorText(e, 'Failed to create competition')),
  });

  const updateCompetition = useMutation({
    mutationFn: ({ id, data }) =>
      base44.functions.invoke('updateClubData', { entity: 'Competition', action: 'update', clubId, id, data }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Competition updated');
    },
    onError: (e) => toast.error(errorText(e, 'Failed to update competition')),
  });

  const deleteCompetition = useMutation({
    mutationFn: (id) =>
      base44.functions.invoke('updateClubData', { entity: 'Competition', action: 'delete', clubId, id }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Competition deleted');
    },
    onError: (e) => toast.error(errorText(e, 'Failed to delete competition')),
  });

  return {
    clubCompetitions: clubQuery.data || [],
    platformCompetitions: showPlatformCompetitions ? (platformQuery.data || []) : [],
    isLoading: clubQuery.isLoading || platformQuery.isLoading,
    createCompetition,
    updateCompetition,
    deleteCompetition,
  };
}