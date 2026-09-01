import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { coreSupabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '@/lib/createNotification';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Icd10Selector } from '@/components/ui/icd10-selector';
import type { Icd10Diagnosis } from '@/lib/icd10-utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacidad?: any | null;
  defaultEmployeeId?: string;
}

export function IncapacidadForm({ open, onOpenChange, incapacidad, defaultEmployeeId }: Props) {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState<string>('');
  const [tipo, setTipo] = useState<string>('enfermedad_general');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [diagnosticos, setDiagnosticos] = useState<Icd10Diagnosis[]>([]);
  const [entidad, setEntidad] = useState('');
  const [numeroRadicado, setNumeroRadicado] = useState('');
  const [estado, setEstado] = useState<string>('registrada');
  const [notas, setNotas] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (incapacidad) {
      setEmployeeId(incapacidad.employee_id);
      setTipo(incapacidad.tipo);
      setFechaInicio(incapacidad.fecha_inicio);
      setFechaFin(incapacidad.fecha_fin);
      setDiagnostico(incapacidad.diagnostico ?? '');
      // Support both old (codigo_cie string) and new (diagnosticos_json array) formats
      if (incapacidad.diagnosticos_json && Array.isArray(incapacidad.diagnosticos_json)) {
        setDiagnosticos(incapacidad.diagnosticos_json);
      } else if (incapacidad.codigo_cie) {
        setDiagnosticos([{ code: incapacidad.codigo_cie, es: incapacidad.diagnostico || incapacidad.codigo_cie, en: '' }]);
      } else {
        setDiagnosticos([]);
      }
      setEntidad(incapacidad.entidad ?? '');
      setNumeroRadicado(incapacidad.numero_radicado ?? '');
      setEstado(incapacidad.estado);
      setNotas(incapacidad.notas_internas ?? '');
    } else {
      setEmployeeId(defaultEmployeeId ?? '');
      setTipo('enfermedad_general'); setFechaInicio(''); setFechaFin('');
      setDiagnostico(''); setDiagnosticos([]); setEntidad(''); setNumeroRadicado('');
      setEstado('registrada'); setNotas(''); setFile(null);
    }
  }, [incapacidad, defaultEmployeeId, open]);

  const { data: employees } = useQuery({
    queryKey: ['employees-min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number, tenant_id')
        .eq('active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: tipos } = useQuery({
    queryKey: ['incapacidad-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incapacidad_types' as any)
        .select('code, name, is_standard')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const dias = (() => {
    if (!fechaInicio || !fechaFin) return 0;
    try { return Math.max(1, differenceInCalendarDays(parseISO(fechaFin), parseISO(fechaInicio)) + 1); }
    catch { return 0; }
  })();

  const save = useMutation({
    mutationFn: async () => {
      if (!employeeId || !fechaInicio || !fechaFin) throw new Error('Faltan campos requeridos');
      const emp = employees?.find((e) => e.id === employeeId);
      if (!emp) throw new Error('Empleado no encontrado');

      setSaving(true);
      let documentUrl = incapacidad?.documento_url ?? null;

      let documentoSize = incapacidad?.documento_size ?? null;

      if (file) {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = error => reject(error);
        });

        const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
          body: {
            platform_id: import.meta.env.VITE_PLATFORM_ID,
            tenantId: emp.tenant_id,
            fileName: `${Date.now()}_${file.name}`,
            fileBase64: base64data,
            mimeType: file.type || "application/octet-stream",
            path_components: ['Soportes', 'Evidencias', 'Incapacidades', employeeId]
          }
        });

        if (uploadError || !uploadData?.success) throw new Error(uploadError?.message || uploadData?.error || "Error al subir documento");
        documentUrl = `https://drive.google.com/uc?id=${uploadData.fileId}`;
        documentoSize = file.size;
      }

      const payload: any = {
        tenant_id: emp.tenant_id,
        employee_id: employeeId,
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias,
        diagnostico: diagnostico || (diagnosticos.length > 0 ? diagnosticos.map(d => d.es).join('; ') : null),
        codigo_cie: diagnosticos.length > 0 ? diagnosticos[0].code : null,
        diagnosticos_json: diagnosticos.length > 0 ? diagnosticos : null,
        entidad: entidad || null,
        numero_radicado: numeroRadicado || null,
        estado,
        notas_internas: notas || null,
        documento_url: documentUrl,
        documento_size: documentoSize,
      };

      if (incapacidad?.id) {
        const { error } = await supabase.from('incapacidades' as any).update(payload).eq('id', incapacidad.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incapacidades' as any).insert({ ...payload, origen: 'admin' });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['incapacidades'] });
      qc.invalidateQueries({ queryKey: ['employee-incapacidades'] });
      toast.success(incapacidad ? 'Incapacidad actualizada' : 'Incapacidad registrada');

      if (incapacidad?.id && employeeId) {
        try {
          const { data: empUser } = await supabase
            .from('employees' as any)
            .select('user_id, first_name, last_name, tenant_id')
            .eq('id', employeeId)
            .single();
          if (empUser?.user_id) {
            const estadoLabel = estado === 'aprobada' ? 'aprobada' : estado === 'rechazada' ? 'rechazada' : estado;
            await createNotification({
              userId: empUser.user_id,
              tenantId: empUser.tenant_id,
              title: `Incapacidad ${estadoLabel}`,
              message: `Su incapacidad del ${fechaInicio} al ${fechaFin} fue ${estadoLabel}.`,
              type: estado === 'aprobada' ? 'success' : estado === 'rechazada' ? 'error' : 'info',
            });
          }
        } catch { /* silent */ }
      }

      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{incapacidad ? 'Editar incapacidad' : 'Nueva incapacidad'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Empleado *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!defaultEmployeeId || !!incapacidad}>
              <SelectTrigger><SelectValue placeholder="Selecciona un empleado" /></SelectTrigger>
              <SelectContent>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} — {e.document_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tipos?.map((t) => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="registrada">Registrada</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
                <SelectItem value="transcrita_nomina">Transcrita a nómina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fecha inicio *</Label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div>
            <Label>Fecha fin *</Label>
            <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>

          <div className="md:col-span-2 text-sm text-muted-foreground">
            Duración calculada: <strong>{dias} día(s)</strong>
          </div>

          <div>
            <Label>Entidad (EPS / ARL)</Label>
            <Input value={entidad} onChange={(e) => setEntidad(e.target.value)} />
          </div>
          <div>
            <Label>N° radicado</Label>
            <Input value={numeroRadicado} onChange={(e) => setNumeroRadicado(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Diagnóstico CIE-10 (hasta 3)</Label>
            <Icd10Selector value={diagnosticos} onChange={setDiagnosticos} />
          </div>
          <div className="md:col-span-2">
            <Label>Observaciones clínicas</Label>
            <Textarea rows={2} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Descripción adicional del diagnóstico..." />
          </div>
          <div>
            <Label>Documento (PDF)</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {incapacidad?.documento_url && !file && (
              <p className="text-xs text-muted-foreground mt-1">Documento actual conservado</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label>Notas internas</Label>
            <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
