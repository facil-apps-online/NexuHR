import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  tenantId: string;
  userId?: string | null;
  employeeId?: string | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
}

export async function createNotification({
  tenantId,
  userId,
  employeeId,
  title,
  message,
  type = 'info',
  link,
}: CreateNotificationParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: userId || null,
    employee_id: employeeId || null,
    title,
    message,
    type,
    link,
    read: false,
  });
  if (error) console.error('Error creating notification:', error);
}

export async function createBulkNotifications(
  tenantId: string,
  employeeIds: string[],
  title: string,
  message: string,
  type = 'info',
  link?: string,
): Promise<void> {
  if (employeeIds.length === 0) return;

  const notifications = employeeIds.map(employeeId => ({
    tenant_id: tenantId,
    employee_id: employeeId,
    title,
    message,
    type,
    link,
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) console.error('Error creating bulk notifications:', error);
}
