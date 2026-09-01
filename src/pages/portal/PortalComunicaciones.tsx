import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mail, CheckCheck, Search, Inbox, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Communication {
  id: string;
  subject: string;
  content: string;
  communication_type: string;
  status: string | null;
  priority: string | null;
  created_at: string | null;
  sent_at: string | null;
  attachment_urls: string[] | null;
  read?: boolean;
  read_at?: string | null;
}

export default function PortalComunicaciones() {
  const { employee } = useEmployeePortalAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['portal-communications', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      if (!employee) return [];
      const { data: commData, error } = await portalSupabase
        .from('communications')
        .select('id, subject, content, communication_type, status, priority, created_at, sent_at, attachment_urls, recipients')
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'enviado')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const commIds = (commData || []).map((c) => c.id);
      if (commIds.length === 0) return [];

      const { data: reads } = await portalSupabase
        .from('communication_reads')
        .select('communication_id, read_at')
        .eq('user_id', employee.id)
        .in('communication_id', commIds);

      const readsMap = new Map((reads || []).map((r) => [r.communication_id, r.read_at]));

      return (commData || []).map((c) => ({
        ...c,
        read: readsMap.has(c.id),
        read_at: readsMap.get(c.id) || null,
      })) as Communication[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (commId: string) => {
      if (!employee) return;
      const { error } = await portalSupabase
        .from('communication_reads')
        .upsert({
          communication_id: commId,
          user_id: employee.id,
          read_at: new Date().toISOString(),
        }, { onConflict: 'communication_id,user_id' });
      if (error) throw error;

      // Notify admin that employee read the communication
      try {
        const { data: admins } = await portalSupabase
          .from('profiles' as any)
          .select('user_id')
          .eq('tenant_id', employee.tenant_id)
          .eq('role', 'admin');
        if (admins && admins.length > 0) {
          const comm = communications.find(c => c.id === commId);
          const notifications = admins.map((a: any) => ({
            user_id: a.user_id,
            tenant_id: employee.tenant_id,
            title: 'Comunicación leída',
            message: `${employee.first_name} ${employee.last_name} leyó la comunicación "${comm?.subject ?? ''}".`,
            type: 'info',
            read: false,
          }));
          await portalSupabase.from('notifications').insert(notifications);
        }
      } catch { /* silent */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-communications'] });
    },
  });

  const filtered = communications.filter((c) => {
    const matchesSearch = !searchTerm || c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || c.communication_type === typeFilter;
    const matchesRead = readFilter === 'all' || (readFilter === 'read' && c.read) || (readFilter === 'unread' && !c.read);
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = communications.filter((c) => !c.read).length;

  return (
    <EmployeePortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis comunicaciones</h1>
          <p className="text-muted-foreground">Comunicaciones enviadas por tu empresa.</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary">{unreadCount} sin leer</Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por asunto..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="importante">Importante</SelectItem>
                <SelectItem value="capacitacion">Capacitación</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={(v: 'all' | 'unread' | 'read') => setReadFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Sin leer</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando comunicaciones...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay comunicaciones</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || readFilter !== 'all'
                ? 'No se encontraron con los filtros seleccionados'
                : 'Aún no has recibido comunicaciones'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className={`transition-colors hover:shadow-md ${!c.read ? 'border-l-4 border-l-primary bg-muted/30' : ''}`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold ${!c.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {c.subject}
                      </h3>
                      {!c.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <Badge variant="outline" className="text-xs">
                        {c.communication_type}
                      </Badge>
                      {c.priority && c.priority !== 'normal' && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          {c.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {c.sent_at && (
                        <span>{format(new Date(c.sent_at), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                      )}
                      {c.read && c.read_at && (
                        <span className="text-emerald-600">Leído {format(new Date(c.read_at), "dd MMM, HH:mm", { locale: es })}</span>
                      )}
                      {c.attachment_urls && c.attachment_urls.length > 0 && (
                        <span>{c.attachment_urls.length} adjunto(s)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!c.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead.mutate(c.id)}
                        disabled={markAsRead.isPending}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Marcar leído
                      </Button>
                    )}
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
