import { supabase } from "@/lib/supabaseClient";

/**
 * Invoca una acción en la Edge Function `tenant-actions` del proyecto NexuHR.
 * Equivalente a `callTenantAction` en Glamtica/TattooSuite.
 */
export const callTenantAction = async (action: string, payload: any = {}) => {
  const { data, error } = await supabase.functions.invoke('tenant-actions', {
    body: { action, payload },
  });

  if (error) {
    console.error(`callTenantAction: Error al invocar 'tenant-actions' para la acción '${action}'`, error);
    throw error;
  }

  if (!data || data.error) {
    const errorMessage = data?.error || `La acción '${action}' no devolvió datos.`;
    console.error(`Error from tenant-actions para la acción '${action}':`, errorMessage);
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * Alias de callTenantAction para compatibilidad con el patrón fetchTenantAction.
 */
export async function fetchTenantAction(action: string, payload: any = {}) {
  return callTenantAction(action, payload);
}
