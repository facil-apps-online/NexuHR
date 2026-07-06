import { useMutation } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';

interface CheckoutRequest {
  tenantId: string;
  redirectUrl: string;
  userId: string;
  planId: string;
  currency?: string;
  extraItems?: Array<{ assetId: string; quantity: number }>;
}

const generateWompiCheckout = async (request: CheckoutRequest) => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: {
      action: 'generate_wompi_checkout',
      payload: request,
    },
  });

  if (error) {
    throw new Error(`Error al generar el checkout de Wompi: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Ocurrió un error desconocido en el servidor.');
  }

  return data.checkoutData;
};

export const useWompiCheckout = () => {
  return useMutation({
    mutationFn: generateWompiCheckout,
  });
};
