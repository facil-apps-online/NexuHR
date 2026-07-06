import { useQuery } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';
import type { SubscriptionInfo } from '@/types/subscription';

const fetchSubscriptionStatus = async (tenantId: string, platformId: string): Promise<SubscriptionInfo | null> => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_subscription_status', payload: { tenantId, platformId } },
  });

  if (error) {
    console.error('[useActiveSubscription] Error:', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    status: data.status || 'cancelado',
    end_date: data.ends_at || null,
    plan_name: data.plan_name || null,
  };
};

export const useSubscriptionStatus = (tenantId: string | null | undefined, platformId: string | null | undefined) => {
  return useQuery<SubscriptionInfo | null, Error>({
    queryKey: ['subscription_status', tenantId, platformId],
    queryFn: () => fetchSubscriptionStatus(tenantId!, platformId!),
    enabled: !!tenantId && !!platformId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};
