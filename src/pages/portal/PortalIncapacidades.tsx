import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { useEmployeeActivity } from '@/hooks/useEmployeeActivity';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Loader2, HeartPulse, Download, FileX } from 'lucide-react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

const estadoBadge: Record<string, JSX.Element> = {
  registrada: <Badge variant="secondary">Registrada</Badge>,
  en_revision: <Badge className="bg-warning/10 text-warning border-warning/20">En revisión</Badge>,
  aprobada: <Badge className="bg-success/10 text-success border-success/20">Aprobada</Badge>,
  rechazada: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rechazada</Badge>,
  transcrita_nomina: <Badge className="bg-primary/10 text-primary border-primary/20">Procesada</Badge>,
};

export default function PortalIncapacidades() {
  const { employee } = useEmployeePortalAuth();
  const { log } = useEmployeeActivity();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState('enfermedad_general');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [entidad, setEntidad] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: incs = [], isLoading } = useQuery({
    queryKey: ['portal-incapacidades', employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await portalSupabase
        .from('incapacidades' as any)
        .select('*')
        .eq('employee_id', employee!.id)
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ['portal-incapacidad-types'],
    queryFn: async () => {
      const { data, error } = await portalSupabase
        .from('incapacidad_types' as any)
        .select('code, name')
        .eq('active', true);
      if (error) throw error;
      return data as any[];
    },
  });

  const dias = (() => {
    if (!fechaInicio || !fechaFin) return 0;
    try { return Math.max(1, differenceInCalendarDays(parseISO(fechaFin), parseISO(fechaInicio)) + 1); }
    catch { return 0; }
  })();

  const reset = () => { setTipo('enfermedad_general'); setFechaInicio(''); setFechaFin(''); setDiagnostico(''); setEntidad(''); setFile(null); };

  const submit = useMutation({
    mutationFn: async () => {
      if (!employee) return;
      if (!fechaInicio || !fechaFin || !file) throw new Error('Completa todos los campos y adjunta el PDF de la incapacidad');
      setSaving(true);
      const path = `${employee.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await portalSupabase.storage.from('incapacidades').upload(path, file);
      if (upErr) throw upErr;
      const { error } = await portalSupabase.from('incapacidades' as any).insert({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        tipo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, dias,
        diagnostico: diagnostico || null, entidad: entidad || null,
        documento_url: path, estado: 'registrada', origen: 'portal_empleado',
      });
      if (error) throw error;
      await log('reporto_incapacidad', { entity_type: 'incapacidad', metadata: { tipo, dias } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-incapacidades'] });
      toast.success('Incapacidad enviada. Tu empresa la revisará pronto.');
      reset(); setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  const handleDownload = async (path: string) => {
    const { data, error } = await portalSupabase.storage.from('incapacidades').createSignedUrl(path, 60);
    if (error) { toast.error('No se pudo descargar'); return; }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <EmployeePortalLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-primary" /> Mis incapacidades
          </h1>
          <p className="text-muted-foreground text-sm">Reporta y consulta tus incapacidades y licencias.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-5 w-5" /> Reportar
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
      ) : incs.length === 0 ? (
        <Card><CardContent className="py-10 flex flex-col items-center text-muted-foreground gap-2">
          <FileX className="h-10 w-10" /><p>Aún no tienes incapacidades registradas</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {incs.map((i: any) => (
            <Card key={i.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-semibold capitalize">{i.tipo.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(i.fecha_inicio), 'dd/MM/yyyy')} → {format(new Date(i.fecha_fin), 'dd/MM/yyyy')} · {i.dias} día(s)
                  </p>
                  {i.entidad && <p className="text-xs text-muted-foreground">{i.entidad}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {estadoBadge[i.estado]}
                  {i.documento_url && (
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(i.documento_url)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reportar incapacidad</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t: any) => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Inicio *</Label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
              <div><Label>Fin *</Label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
            </div>
            <p className="text-sm text-muted-foreground">Duración: <strong>{dias} día(s)</strong></p>
            <div><Label>Entidad (EPS / ARL)</Label><Input value={entidad} onChange={(e) => setEntidad(e.target.value)} /></div>
            <div><Label>Diagnóstico (opcional)</Label><Textarea rows={2} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} /></div>
            <div>
              <Label>PDF de la incapacidad *</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={() => submit.mutate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EmployeePortalLayout>
  );
}
