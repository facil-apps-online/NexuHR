import { coreSupabase } from "@/lib/supabaseClient";

/**
 * Invoca una Edge Function del proyecto Core centralizado del ecosistema FacilApps.
 * Equivalente a `callCoreAction` en Glamtica/TattooSuite.
 */
export const callCoreAction = async (functionName: string, payload: any) => {
  const { data, error } = await coreSupabase.functions.invoke(functionName, {
    body: payload, // El payload se envía directamente como body
  });

  if (error) {
    console.error(`callCoreAction: Error al invocar la Edge Function Core '${functionName}'`, error);
    throw error;
  }

  return data;
};
