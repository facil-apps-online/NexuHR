import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

const fetchGoogleDriveImage = async (fileId: string, tenantId: string, platformId: string) => {
  if (!fileId || !tenantId || !platformId) {
    return undefined;
  }

  const proxyUrl = `${import.meta.env.VITE_CORE_SUPABASE_URL}/functions/v1/proxy-google-drive-image?fileId=${fileId}&tenantId=${tenantId}&platformId=${platformId}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Proxy fetch failed with status ${response.status} for fileId ${fileId}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    return undefined;
  }

  return URL.createObjectURL(blob);
};

export const useGoogleDriveImage = (src?: string, tenantIdFromProp?: string) => {
  const { tenantId: tenantIdFromAuth } = useAuth();
  const tenantId = tenantIdFromProp || tenantIdFromAuth;
  const platformId = import.meta.env.VITE_PLATFORM_ID;

  let fileId: string | null = null;
  if (src) {
    if (src.startsWith('blob:')) {
      // It's already a local blob URL, no need to fetch.
    } else if (src.includes('drive.google.com')) {
      try {
        const url = new URL(src);
        fileId = url.searchParams.get('id');
      } catch (e) {
        console.error("Invalid Google Drive URL:", src);
      }
    } else if (!src.startsWith('http') && !src.startsWith('/')) {
      fileId = src;
    }
  }

  const { data: displayUrl, isLoading } = useQuery({
    queryKey: ['googleDriveImage', fileId, tenantId, platformId],
    queryFn: () => fetchGoogleDriveImage(fileId!, tenantId!, platformId!),
    enabled: !!fileId && !!tenantId && !!platformId,
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (!fileId) {
    return { displayUrl: src, isLoading: false };
  }

  return { displayUrl, isLoading };
};
