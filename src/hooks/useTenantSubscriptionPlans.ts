import { useQuery } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import type { UserSubscriptionPlan } from '@/types/subscription';

const fetchTenantSubscriptionPlans = async (tenantId: string, platformId: string): Promise<UserSubscriptionPlan[]> => {
  if (!tenantId || !platformId) return [];

  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_tenant_subscription_plans', payload: { tenantId, platformId } },
  });

  if (error) {
    throw new Error(`Error fetching tenant subscription plans: ${error.message}`);
  }

  return data || [];
};

export const useTenantSubscriptionPlans = () => {
  const { currentAssignment, loading: isAuthLoading } = useAuth();
  const tenantId = currentAssignment?.tenant_id;
  const platformId = currentAssignment?.platform_id;

  return useQuery<UserSubscriptionPlan[], Error>({
    queryKey: ['tenant_subscription_plans', tenantId, platformId],
    queryFn: () => fetchTenantSubscriptionPlans(tenantId!, platformId!),
    enabled: !isAuthLoading && !!tenantId && !!platformId,
  });
};
