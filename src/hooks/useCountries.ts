import { useQuery } from '@tanstack/react-query';

export interface Country {
  id: string;
  name: string;
  iso_code: string;
  currency_id: string;
  timezone: string;
  default_language_iso_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  field_placeholders: {
    phone: {
      label: 'fijo' | 'movil';
      value: string;
    }[];
  } | null;
  currencies: {
    code: string;
    symbol: string;
  } | null;
}

const fetchCountries = async (): Promise<Country[]> => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/public-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'get-countries',
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch countries');
  }
  return json;
};

export const useCountries = () => {
  return useQuery<Country[], Error>({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};