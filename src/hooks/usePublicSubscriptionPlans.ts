import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { PublicSubscriptionPlan } from "@/types/subscription";

const fetchPublicSubscriptionPlans = async (countryId: string, platformId: string): Promise<PublicSubscriptionPlan[]> => {
  if (!countryId || !platformId) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke('public-actions', {
    body: {
      action: 'GET_PUBLIC_SUBSCRIPTION_PLANS',
      payload: { countryId, platformId },
    },
  });

  if (error) {
    throw new Error(`Error fetching public subscription plans: ${error.message}`);
  }

  return data || [];
};

export const usePublicSubscriptionPlans = (countryId?: string, platformId?: string) => {
  return useQuery<PublicSubscriptionPlan[], Error>({
    queryKey: ["publicSubscriptionPlans", countryId, platformId],
    queryFn: () => fetchPublicSubscriptionPlans(countryId!, platformId!),
    enabled: !!countryId && !!platformId,
  });
};
