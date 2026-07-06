import { useQuery } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';

export interface PhonePrefix {
  id: string;
  country_name: string;
  iso_code: string;
  prefix: string;
}

const fetchPhonePrefixes = async (): Promise<PhonePrefix[]> => {
    const { data, error } = await coreSupabase.functions.invoke('public-actions', {
        body: {
            action: 'get-phone-prefixes',
        }
    });

    if (error) {
        throw new Error(error.message || 'Failed to fetch phone prefixes');
    }
    return data;
};

export const usePhonePrefixes = () => {
  return useQuery<PhonePrefix[], Error>({
    queryKey: ['phone_prefixes'],
    queryFn: fetchPhonePrefixes,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};