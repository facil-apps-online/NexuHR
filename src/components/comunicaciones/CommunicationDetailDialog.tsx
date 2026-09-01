import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CommunicationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: any | null;
}

const typeLabels: Record<string, string> = {
  circular: 'Circular',
  memorando: 'Memorando',
  notificacion: 'Notificación',
  alerta: 'Alerta',
};

const priorityColors: Record<string, string> = {
  normal: 'bg-muted text-muted-foreground',
  urgente: 'bg-warning/10 text-warning border-warning/20',
  critica: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function CommunicationDetailDialog({ open, onOpenChange, communication }: CommunicationDetailDialogProps) {
  const { data: reads = [] } = useQuery({
    queryKey: ['communication-reads', communication?.id],
    enabled: !!communication?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_reads')
        .select('user_id, read_at')
        .eq('communication_id', communication!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ['communication-recipients', communication?.id],
    enabled: !!communication?.id && open,
    queryFn: async () => {
      const ids = communication!.recipients || [];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number')
        .in('id', ids);
      if (error) throw error;
      return data;
    },
  });

  if (!communication) return null;

  const readsMap = new Map(reads.map(r => [r.user_id, r.read_at]));
  const readCount = reads.length;
  const totalRecipients = communication.recipients?.length || 0;
  const readPct = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{communication.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{typeLabels[communication.communication_type] || communication.communication_type}</Badge>
            <Badge variant="outline" className={priorityColors[communication.priority] || ''}>{communication.priority}</Badge>
            <Badge variant="outline">
              {communication.status === 'enviado' ? 'Enviado' : communication.status === 'borrador' ? 'Borrador' : 'Leído'}
            </Badge>
            {communication.sent_at && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(communication.sent_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </span>
            )}
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 rounded-md p-4">
            <p className="whitespace-pre-wrap">{communication.content}</p>
          </div>

          {communication.attachment_urls && communication.attachment_urls.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Adjuntos:</p>
              <div className="flex flex-wrap gap-2">
                {communication.attachment_urls.map((url: string, i: number) => (
                  <Button key={i} variant="outline" size="sm" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3 mr-1" /> Adjunto {i + 1}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Destinatarios ({totalRecipients})</p>
              <Badge className={readPct >= 80 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                {readCount}/{totalRecipients} leído{readCount !== 1 ? 's' : ''} ({readPct}%)
              </Badge>
            </div>

            <ScrollArea className="max-h-60">
              <div className="space-y-1">
                {recipients.map((emp: any) => {
                  const readAt = readsMap.get(emp.id);
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded text-sm hover:bg-accent/50">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{emp.first_name} {emp.last_name}</span>
                        <span className="text-muted-foreground text-xs">{emp.document_number}</span>
                      </div>
                      {readAt ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">{format(new Date(readAt), 'dd/MM HH:mm')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Pendiente</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {recipients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin destinatarios</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
