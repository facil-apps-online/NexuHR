import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from './useEmployeePortalAuth';

export function useEmployeeActivity() {
  const { employee } = useEmployeePortalAuth();

  const log = async (
    action: string,
    opts: { entity_type?: string; entity_id?: string; metadata?: Record<string, any> } = {}
  ) => {
    if (!employee) return;
    try {
      await portalSupabase.from('employee_activity_log').insert({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        action,
        entity_type: opts.entity_type ?? null,
        entity_id: opts.entity_id ?? null,
        metadata: opts.metadata ?? {},
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      } as any);
    } catch {
      // silent — activity log is best-effort
    }
  };

  return { log };
}
