import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from './useEmployeePortalAuth';

export function usePortalNotifications() {
  const { employee } = useEmployeePortalAuth();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['portal-notifications', employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await portalSupabase
        .from('notifications' as any)
        .select('*')
        .eq('employee_id', employee!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60_000,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await portalSupabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!employee?.id) return;
      const { error } = await portalSupabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('employee_id', employee.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-notifications'] }),
  });

  return { notifications, unreadCount, markRead, markAllRead };
}
