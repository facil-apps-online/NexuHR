import { useQuery } from '@tanstack/react-query';
import { coreSupabase, supabase } from '@/lib/supabaseClient';
import type { SubscriptionUsage } from '@/types/subscription';

interface StorageBreakdown {
  category: string;
  size: number;
}

interface StorageUsage {
  totalSize: number;
  breakdown: StorageBreakdown[];
}

const fetchSubscriptionUsage = async (tenantId: string, platformId: string): Promise<SubscriptionUsage | null> => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_subscription_usage', payload: { tenantId, platformId } },
  });

  if (error) {
    console.error('[useSubscriptionUsage] Error:', error);
    throw new Error(error.message);
  }

  const usage = data as SubscriptionUsage | null;

  // Enrich storage usage with actual file sizes from local DB
  if (usage?.usage) {
    const { data: storageData, error: storageError } = await supabase.functions.invoke('tenant-actions', {
      body: { action: 'get_storage_usage', payload: { tenantId } },
    });
    if (!storageError && storageData?.totalSize != null) {
      for (const asset of usage.usage) {
        if (asset.asset_purpose_key === 'storage') {
          const limitBytes = asset.limit ? parseFloat(asset.limit) * 1024 * 1024 * 1024 : 0;
          const usedBytes = storageData.totalSize;
          asset.used = limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 100) / 100 : 0;
          asset.usedFormatted = formatBytes(usedBytes);
          asset.raw_used = usedBytes;
          break;
        }
      }
    }
  }

  return usage;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const useSubscriptionUsage = (tenantId: string | null | undefined, platformId: string | null | undefined) => {
  return useQuery<SubscriptionUsage | null, Error>({
    queryKey: ['subscription_usage', tenantId, platformId],
    queryFn: () => fetchSubscriptionUsage(tenantId!, platformId!),
    enabled: !!tenantId && !!platformId,
    staleTime: 1000 * 60 * 5,
  });
};
