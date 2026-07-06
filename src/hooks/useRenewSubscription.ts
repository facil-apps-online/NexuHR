import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ActivateSubscriptionParams {
  planId: string;
}

export const useRenewSubscription = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ planId }: ActivateSubscriptionParams) => {
      if (!planId || !tenantId) {
        throw new Error('El ID del plan y del tenant son requeridos.');
      }

      const { data, error } = await coreSupabase.functions.invoke('core-actions', {
        body: {
          action: 'activate_subscription',
          payload: { tenantId, planId },
        },
      });

      if (error) throw new Error(`Error al activar la suscripción: ${error.message}`);
      if (!data?.success) throw new Error(data?.message || 'Error al activar la suscripción');

      return data;
    },
    onSuccess: () => {
      toast({
        title: '¡Suscripción Activada!',
        description: 'Tu cuenta ha sido reactivada. ¡Bienvenido de nuevo!',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription_status', tenantId] });
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error en la Renovación',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
