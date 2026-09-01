import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { coreSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Save, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface CommunicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication?: any | null;
}

type RecipientMode = 'all' | 'list' | 'custom';

export function CommunicationForm({ open, onOpenChange, communication }: CommunicationFormProps) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [contentType, setContentType] = useState('circular');
  const [priority, setPriority] = useState('normal');
  const [content, setContent] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (communication) {
      setSubject(communication.subject || '');
      setContentType(communication.communication_type || 'circular');
      setPriority(communication.priority || 'normal');
      setContent(communication.content || '');
      setRecipientMode('custom');
      setSelectedEmployees(communication.recipients || []);
    } else {
      reset();
    }
  }, [communication, open]);

  const reset = () => {
    setSubject('');
    setContentType('circular');
    setPriority('normal');
    setContent('');
    setRecipientMode('all');
    setSelectedListId('');
    setSelectedEmployees([]);
    setAttachments([]);
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number, email, tenant_id')
        .eq('active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['distribution_lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_lists')
        .select('id, name, list_type')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: listMembers = [] } = useQuery({
    queryKey: ['list-members', selectedListId],
    enabled: !!selectedListId && recipientMode === 'list',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_list_members')
        .select('employee_id')
        .eq('list_id', selectedListId);
      if (error) throw error;
      return data.map(m => m.employee_id);
    },
  });

  const getRecipientIds = (): string[] => {
    if (recipientMode === 'all') return employees.map(e => e.id);
    if (recipientMode === 'list') return listMembers;
    return selectedEmployees;
  };

  const handleUploadAttachments = async (tenantId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of attachments) {
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });
      const { data, error } = await coreSupabase.functions.invoke('google-drive-upload', {
        body: {
          platform_id: import.meta.env.VITE_PLATFORM_ID,
          tenantId,
          fileName: `${Date.now()}_${file.name}`,
          fileBase64: base64data,
          mimeType: file.type || 'application/octet-stream',
          path_components: ['Comunicaciones', 'Adjuntos'],
        },
      });
      if (!error && data?.success) {
        urls.push(`https://drive.google.com/uc?id=${data.fileId}`);
      }
    }
    return urls;
  };

  const save = useMutation({
    mutationFn: async (sendNow: boolean) => {
      if (!profile?.tenant_id) throw new Error('Sin tenant');
      if (!subject.trim()) throw new Error('El asunto es requerido');
      if (!content.trim()) throw new Error('El contenido es requerido');

      setSaving(true);
      const recipientIds = getRecipientIds();
      if (recipientIds.length === 0) throw new Error('Selecciona al menos un destinatario');

      const attachmentUrls = await handleUploadAttachments(profile.tenant_id);

      const payload: any = {
        tenant_id: profile.tenant_id,
        communication_type: contentType,
        subject: subject.trim(),
        content: content.trim(),
        priority,
        recipients: recipientIds,
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
        status: sendNow ? 'enviado' : 'borrador',
        sent_at: sendNow ? new Date().toISOString() : null,
        created_by: profile.user_id,
      };

      if (communication?.id) {
        const { error } = await supabase.from('communications').update(payload).eq('id', communication.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('communications').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, sendNow) => {
      qc.invalidateQueries({ queryKey: ['communications'] });
      toast.success(sendNow ? 'Comunicación enviada' : 'Borrador guardado');
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const previewRecipients = getRecipientIds().length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{communication ? 'Editar comunicación' : 'Nueva comunicación'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Asunto *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Reunión general empresa..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="memorando">Memorando</SelectItem>
                  <SelectItem value="notificacion">Notificación</SelectItem>
                  <SelectItem value="alerta">Alerta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Contenido *</Label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe el contenido de la comunicación..." />
          </div>

          <div>
            <Label>Destinatarios *</Label>
            <Select value={recipientMode} onValueChange={(v) => setRecipientMode(v as RecipientMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados ({employees.length})</SelectItem>
                <SelectItem value="list">Lista de distribución</SelectItem>
                <SelectItem value="custom">Selección personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientMode === 'list' && (
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar lista..." /></SelectTrigger>
              <SelectContent>
                {lists.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name} ({l.list_type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {recipientMode === 'custom' && (
            <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-1">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="rounded"
                  />
                  <span className="truncate">{emp.first_name} {emp.last_name}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{emp.document_number}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Destinatarios seleccionados: <strong>{previewRecipients}</strong></span>
          </div>

          <div>
            <Label>Adjuntos (opcional)</Label>
            <Input
              type="file"
              multiple
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setAttachments(prev => [...prev, ...(e.target.files || [])])}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {attachments.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <Paperclip className="h-3 w-3" />
                    {f.name}
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="outline" onClick={() => save.mutate(false)} disabled={saving || !subject.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar borrador
          </Button>
          <Button onClick={() => save.mutate(true)} disabled={saving || !subject.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
