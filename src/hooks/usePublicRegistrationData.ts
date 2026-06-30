import { useQuery } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';

// Tipos de datos que esperamos de la función RPC
export interface PublicCountry {
  id: string;
  name: string;
  iso_code: string;
  is_active: boolean;
  default_localization_id: string | null;
  default_currency_id: string | null;
  timezones: string[] | null;
}

export interface PublicLanguage {
  id: string;
  name: string;
  iso_code: string;
}

export interface PublicCurrency {
  id: string;
  name: string;
  symbol: string;
  code: string;
  decimal_places: number;
  symbol_position: string;
  decimal_separator: string;
  thousands_separator: string;
}

export interface PublicRegistrationData {
  countries: PublicCountry[];
  languages: PublicLanguage[];
  currencies: PublicCurrency[];
}

const fetchPublicRegistrationData = async (platformId: string): Promise<PublicRegistrationData> => {
  const { data, error } = await coreSupabase.functions.invoke('public-actions', {
    body: {
      action: 'get_public_registration_data',
      platform_id: platformId
    }
  });

  if (error) {
    console.error('Error fetching public registration data:', error);
    throw new Error(error.message);
  }

  return data;
};

export const usePublicRegistrationData = (platformId?: string) => {
  return useQuery<PublicRegistrationData, Error>({
    queryKey: ['publicRegistrationData', platformId],
    queryFn: () => fetchPublicRegistrationData(platformId!),
    enabled: !!platformId, // Solo ejecutar si platformId está presente
    staleTime: 1000 * 60 * 60, // Cachear los datos durante 1 hora
    refetchOnWindowFocus: false,
  });
};