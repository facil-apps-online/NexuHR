import { useQuery } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';
import type { SubscriptionUsage } from '@/types/subscription';

const fetchSubscriptionUsage = async (tenantId: string, platformId: string): Promise<SubscriptionUsage | null> => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_subscription_usage', payload: { tenantId, platformId } },
  });

  if (error) {
    console.error('[useSubscriptionUsage] Error:', error);
    throw new Error(error.message);
  }

  return data as SubscriptionUsage;
};

export const useSubscriptionUsage = (tenantId: string | null | undefined, platformId: string | null | undefined) => {
  return useQuery<SubscriptionUsage | null, Error>({
    queryKey: ['subscription_usage', tenantId, platformId],
    queryFn: () => fetchSubscriptionUsage(tenantId!, platformId!),
    enabled: !!tenantId && !!platformId,
    staleTime: 1000 * 60 * 5,
  });
};
