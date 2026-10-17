import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';

const cacheKey = (key) => `bt_ps_${key}`;

function readCache(key, defaultValue) {
  try {
    const cached = localStorage.getItem(cacheKey(key));
    if (cached !== null) return JSON.parse(cached);
  } catch (e) { /* ignore cache errors */ }
  return defaultValue;
}

/**
 * Read a platform-wide setting. Returns { value, isLoading }.
 * Falls back to the last known value cached in localStorage while loading,
 * so there is no flash of the wrong navigation state.
 */
export function usePlatformSetting(key, defaultValue = false) {
  const { data, isLoading } = useQuery({
    queryKey: ['platformSetting', key],
    queryFn: async () => {
      const records = await base44.entities.PlatformSetting.filter({ key });
      const value = records[0]?.bool_value ?? defaultValue;
      try { localStorage.setItem(cacheKey(key), JSON.stringify(value)); } catch (e) { /* ignore */ }
      return value;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const value = data !== undefined ? data : readCache(key, defaultValue);
  return { value, isLoading };
}

/**
 * Update (or create) a platform setting. Platform admins only — the RLS on
 * PlatformSetting rejects writes from other users.
 */
export async function setPlatformSetting(key, bool) {
  const existing = await base44.entities.PlatformSetting.filter({ key });
  if (existing[0]) {
    await base44.entities.PlatformSetting.update(existing[0].id, { bool_value: bool });
  } else {
    await base44.entities.PlatformSetting.create({ key, bool_value: bool });
  }
  try { localStorage.setItem(cacheKey(key), JSON.stringify(bool)); } catch (e) { /* ignore */ }
  queryClientInstance.invalidateQueries({ queryKey: ['platformSetting', key] });
}