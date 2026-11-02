import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Fixture interest for a club.
 * Members get only their own interest records back; club admins and selectors
 * get everyone's, each with the member's display name.
 */
export default function useFixtureInterests(clubId) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fixtureInterests', clubId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getFixtureInterests', { club_id: clubId });
      return res.data || { interests: [], can_see_all: false };
    },
    enabled: !!clubId,
  });

  const toggle = async (fixtureId) => {
    try {
      const res = await base44.functions.invoke('toggleFixtureInterest', {
        club_id: clubId,
        fixture_id: fixtureId,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
        return null;
      }
      queryClient.invalidateQueries({ queryKey: ['fixtureInterests', clubId] });
      return res.data.interested;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update your interest');
      return null;
    }
  };

  return {
    interests: data?.interests || [],
    canSeeAll: !!data?.can_see_all,
    isLoading,
    toggle,
  };
}