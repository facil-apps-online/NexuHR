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

export default function PortalCursos() {
  const { employee } = useEmployeePortalAuth();
  const queryClient = useQueryClient();
  const eid = employee?.id;
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestProvider, setRequestProvider] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-cursos', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('courses')
        .select('id, course_name, provider, start_date, end_date, expiry_date, status, certificate_url, grade')
        .eq('employee_id', eid!)
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const requestCourse = useMutation({
    mutationFn: async () => {
      if (!eid || !employee) throw new Error('Sin empleado');
      if (!requestName.trim()) throw new Error('Ingresa el nombre del curso');

      const { error } = await portalSupabase.from('courses').insert({
        employee_id: eid,
        tenant_id: employee.tenant_id,
        course_name: requestName.trim(),
        provider: requestProvider.trim() || null,
        status: 'pendiente',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-cursos'] });
      toast.success('Solicitud de curso enviada');
      setShowRequestDialog(false);
      setRequestName('');
      setRequestProvider('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadCert = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <EmployeePortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis cursos y certificaciones</h1>
          <p className="text-muted-foreground">Gestiona tus cursos y certificaciones.</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Solicitar curso
        </Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes cursos registrados.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((c: any) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.course_name}</p>
                  <p className="text-sm text-muted-foreground">{c.provider || 'Sin proveedor'}</p>
                  <p className="text-sm mt-1">
                    {c.start_date ?? '—'} → {c.end_date ?? '—'}
                    {c.expiry_date && <span className="ml-3 text-muted-foreground">Vence: {c.expiry_date}</span>}
                  </p>
                  {c.grade != null && <p className="text-sm mt-1">Calificación: <span className="font-medium">{c.grade}</span></p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusVariant(c.status)}>{labelStatus(c.status)}</Badge>
                  {c.certificate_url && (
                    <Button size="sm" variant="outline" onClick={() => downloadCert(c.certificate_url)}>
                      <Download className="h-4 w-4 mr-2" /> Certificado
                    </Button>
                  )}
                </div>
              </div>
              <PortalRecordAttachments
                module="cursos"
                recordId={c.id}
                extraItems={c.certificate_url ? [{ id: `cert-${c.id}`, url: c.certificate_url, type: 'evidence', fileName: 'Certificado' }] : []}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar curso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Nombre del curso *</Label>
              <Input id="courseName" value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Ej: Seguridad industrial" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseProvider">Proveedor (opcional)</Label>
              <Input id="courseProvider" value={requestProvider} onChange={(e) => setRequestProvider(e.target.value)} placeholder="Ej: Cámara de comercio" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancelar</Button>
              <Button onClick={() => requestCourse.mutate()} disabled={requestCourse.isPending || !requestName.trim()}>
                {requestCourse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeePortalLayout>
  );
}

function labelStatus(s: string) {
  return ({ pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado', vencido: 'Vencido', cancelado: 'Cancelado' } as any)[s] || s || '—';
}
function statusVariant(s: string): any {
  if (s === 'completado') return 'default';
  if (s === 'vencido' || s === 'cancelado') return 'destructive';
  return 'secondary';
}
