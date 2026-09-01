import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { PortalRecordAttachments } from '@/components/portal/PortalRecordAttachments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalExamenes() {
  const { employee } = useEmployeePortalAuth();
  const queryClient = useQueryClient();
  const eid = employee?.id;
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestType, setRequestType] = useState('');
  const [requestEntity, setRequestEntity] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-examenes', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('exams')
        .select('id, exam_type, exam_date, scheduled_date, expiry_date, result, status, entity, document_url, observations')
        .eq('employee_id', eid!)
        .order('exam_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  const requestExam = useMutation({
    mutationFn: async () => {
      if (!eid || !employee) throw new Error('Sin empleado');
      if (!requestType.trim()) throw new Error('Ingresa el tipo de examen');

      const { error } = await portalSupabase.from('exams').insert({
        employee_id: eid,
        tenant_id: employee.tenant_id,
        exam_type: requestType.trim(),
        entity: requestEntity.trim() || null,
        status: 'pendiente',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-examenes'] });
      toast.success('Solicitud de examen enviada');
      setShowRequestDialog(false);
      setRequestType('');
      setRequestEntity('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const download = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <EmployeePortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis exámenes médicos</h1>
          <p className="text-sm text-muted-foreground">Tu información médica es confidencial. Solo tú puedes verla.</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Solicitar examen
        </Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes exámenes registrados.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((x: any) => (
            <Card key={x.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{x.exam_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {x.exam_date ? `Realizado: ${x.exam_date}` : x.scheduled_date ? `Programado: ${x.scheduled_date}` : '—'}
                    {x.entity && <> · {x.entity}</>}
                  </p>
                  {x.result && <p className="text-sm mt-1">Resultado: <span className="font-medium">{x.result}</span></p>}
                  {x.expiry_date && <p className="text-sm text-muted-foreground">Vence: {x.expiry_date}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary">{x.status || '—'}</Badge>
                  {x.document_url && (
                    <Button size="sm" variant="outline" onClick={() => download(x.document_url)}>
                      <Download className="h-4 w-4 mr-2" /> Descargar
                    </Button>
                  )}
                </div>
              </div>
              <PortalRecordAttachments
                module="examenes"
                recordId={x.id}
                extraItems={x.document_url ? [{ id: `exam-${x.id}`, url: x.document_url, type: 'evidence', fileName: 'Examen' }] : []}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar examen médico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="examType">Tipo de examen *</Label>
              <Input id="examType" value={requestType} onChange={(e) => setRequestType(e.target.value)} placeholder="Ej: Examen ingreso, Examen periódico" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examEntity">Entidad (opcional)</Label>
              <Input id="examEntity" value={requestEntity} onChange={(e) => setRequestEntity(e.target.value)} placeholder="Ej: EPS, ARL" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancelar</Button>
              <Button onClick={() => requestExam.mutate()} disabled={requestExam.isPending || !requestType.trim()}>
                {requestExam.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeePortalLayout>
  );
}
