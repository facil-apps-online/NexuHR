import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bell, CheckCheck, Inbox, Info, AlertTriangle, Calendar, GraduationCap, Stethoscope, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  read: boolean | null;
  created_at: string | null;
}

const getTypeIcon = (type: string | null) => {
  switch (type) {
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'exam': return <Stethoscope className="h-4 w-4 text-blue-500" />;
    case 'course': return <GraduationCap className="h-4 w-4 text-green-500" />;
    case 'event': return <Calendar className="h-4 w-4 text-purple-500" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTypeBadge = (type: string | null) => {
  switch (type) {
    case 'warning': return <Badge variant="outline" className="border-amber-500 text-amber-600">Advertencia</Badge>;
    case 'exam': return <Badge variant="outline" className="border-blue-500 text-blue-600">Examen</Badge>;
    case 'course': return <Badge variant="outline" className="border-green-500 text-green-600">Curso</Badge>;
    case 'event': return <Badge variant="outline" className="border-purple-500 text-purple-600">Evento</Badge>;
    default: return <Badge variant="outline">Información</Badge>;
  }
};

export default function PortalNotificaciones() {
  const { employee } = useEmployeePortalAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['portal-notifications', employee?.id, typeFilter, readFilter],
    enabled: !!employee,
    queryFn: async () => {
      if (!employee) return [];
      let query = portalSupabase
        .from('notifications')
        .select('*')
        .eq('user_id', employee.id)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (readFilter === 'unread') query = query.eq('read', false);
      else if (readFilter === 'read') query = query.eq('read', true);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Notification[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await portalSupabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await portalSupabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', employee.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasFilters = typeFilter !== 'all' || readFilter !== 'all';

  return (
    <EmployeePortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis notificaciones</h1>
          <p className="text-muted-foreground">Historial completo de notificaciones.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="info">Información</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="exam">Exámenes</SelectItem>
                <SelectItem value="course">Cursos</SelectItem>
                <SelectItem value="event">Eventos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={(v: 'all' | 'unread' | 'read') => setReadFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">No leídas</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando notificaciones...</p>
      ) : notifications.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay notificaciones</h3>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? 'No se encontraron con los filtros seleccionados' : 'Aún no tienes notificaciones'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors hover:shadow-sm ${!n.read ? 'bg-muted/30 border-l-4 border-l-primary' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(n.type)}
                        {n.created_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(n.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {n.created_at && (
                        <span className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </span>
                      )}
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markAsRead.mutate(n.id)}
                          disabled={markAsRead.isPending}
                        >
                          <CheckCheck className="mr-1 h-3 w-3" />
                          Marcar leída
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}
