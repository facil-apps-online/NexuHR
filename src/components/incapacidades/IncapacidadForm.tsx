import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { differenceInCalendarDays, parseISO } from 'date-fns';

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
  const [codigoCie, setCodigoCie] = useState('');
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
      setCodigoCie(incapacidad.codigo_cie ?? '');
      setEntidad(incapacidad.entidad ?? '');
      setNumeroRadicado(incapacidad.numero_radicado ?? '');
      setEstado(incapacidad.estado);
      setNotas(incapacidad.notas_internas ?? '');
    } else {
      setEmployeeId(defaultEmployeeId ?? '');
      setTipo('enfermedad_general'); setFechaInicio(''); setFechaFin('');
      setDiagnostico(''); setCodigoCie(''); setEntidad(''); setNumeroRadicado('');
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

      if (file) {
        const path = `${employeeId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('incapacidades').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        documentUrl = path;
      }

      const payload: any = {
        tenant_id: emp.tenant_id,
        employee_id: employeeId,
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias,
        diagnostico: diagnostico || null,
        codigo_cie: codigoCie || null,
        entidad: entidad || null,
        numero_radicado: numeroRadicado || null,
        estado,
        notas_internas: notas || null,
        documento_url: documentUrl,
      };

      if (incapacidad?.id) {
        const { error } = await supabase.from('incapacidades' as any).update(payload).eq('id', incapacidad.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incapacidades' as any).insert({ ...payload, origen: 'admin' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incapacidades'] });
      qc.invalidateQueries({ queryKey: ['employee-incapacidades'] });
      toast.success(incapacidad ? 'Incapacidad actualizada' : 'Incapacidad registrada');
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
            <Label>Diagnóstico</Label>
            <Textarea rows={2} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
          </div>
          <div>
            <Label>Código CIE-10</Label>
            <Input value={codigoCie} onChange={(e) => setCodigoCie(e.target.value)} />
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
