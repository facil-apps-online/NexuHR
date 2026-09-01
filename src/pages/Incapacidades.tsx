import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, MoreHorizontal, Edit, Trash2, Download, FileText, HeartPulse, Calendar, AlertCircle, CheckCircle2, BarChart3, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { safeNewDate } from "@/lib/utils";
import { toast } from 'sonner';
import { IncapacidadForm } from '@/components/incapacidades/IncapacidadForm';
import type { Icd10Diagnosis } from '@/lib/icd10-utils';

const estadoBadge: Record<string, JSX.Element> = {
  registrada: <Badge variant="secondary">Registrada</Badge>,
  en_revision: <Badge className="bg-warning/10 text-warning border-warning/20">En revisión</Badge>,
  aprobada: <Badge className="bg-success/10 text-success border-success/20">Aprobada</Badge>,
  rechazada: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rechazada</Badge>,
  transcrita_nomina: <Badge className="bg-primary/10 text-primary border-primary/20">Transcrita</Badge>,
};

export default function Incapacidades() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [filterEstado, setFilterEstado] = useState('all');
  const [search, setSearch] = useState('');

  const { data: incapacidades = [], isLoading } = useQuery({
    queryKey: ['incapacidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incapacidades' as any)
        .select('*, employees(first_name, last_name, document_number)')
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => incapacidades.filter((i: any) => {
    if (filterEstado !== 'all' && i.estado !== filterEstado) return false;
    if (search) {
      const t = search.toLowerCase();
      const name = `${i.employees?.first_name ?? ''} ${i.employees?.last_name ?? ''} ${i.employees?.document_number ?? ''}`.toLowerCase();
      const diagText = (i.diagnostico ?? '').toLowerCase();
      const diagCodes = (i.diagnosticos_json ?? []).map((d: Icd10Diagnosis) => `${d.code} ${d.es} ${d.en}`).join(' ').toLowerCase();
      if (!name.includes(t) && !diagText.includes(t) && !diagCodes.includes(t)) return false;
    }
    return true;
  }), [incapacidades, filterEstado, search]);

  const totalDias = incapacidades.reduce((acc: number, i: any) => acc + (i.dias ?? 0), 0);
  const pendientes = incapacidades.filter((i: any) => ['registrada', 'en_revision'].includes(i.estado)).length;
  const aprobadas = incapacidades.filter((i: any) => i.estado === 'aprobada' || i.estado === 'transcrita_nomina').length;

  // CIE-10 analytics
  const topDiagnosticos = useMemo(() => {
    const counter = new Map<string, { code: string; es: string; count: number; days: number }>();
    for (const inc of incapacidades) {
      const dias = inc.dias ?? 0;
      const diags: Icd10Diagnosis[] = inc.diagnosticos_json ?? (inc.codigo_cie ? [{ code: inc.codigo_cie, es: inc.diagnostico || inc.codigo_cie, en: '' }] : []);
      for (const d of diags) {
        const existing = counter.get(d.code);
        if (existing) {
          existing.count++;
          existing.days += dias;
        } else {
          counter.set(d.code, { code: d.code, es: d.es, count: 1, days: dias });
        }
      }
    }
    return Array.from(counter.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [incapacidades]);

  const reincidencia = useMemo(() => {
    const empCount = new Map<string, { name: string; count: number; days: number }>();
    for (const inc of incapacidades) {
      const eid = inc.employee_id;
      const name = `${inc.employees?.first_name ?? ''} ${inc.employees?.last_name ?? ''}`.trim();
      const existing = empCount.get(eid);
      if (existing) {
        existing.count++;
        existing.days += inc.dias ?? 0;
      } else {
        empCount.set(eid, { name, count: 1, days: inc.dias ?? 0 });
      }
    }
    return Array.from(empCount.values()).filter(e => e.count > 1).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [incapacidades]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incapacidades' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incapacidades'] });
      toast.success('Incapacidad eliminada');
      setShowDelete(false); setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const transcribir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incapacidades' as any).update({ estado: 'transcrita_nomina', reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incapacidades'] });
      toast.success('Marcada como transcrita a nómina');
    },
  });

  const handleDownload = async (url: string) => {
    window.open(url, '_blank');
  };

  const columns: ResponsiveColumn<any>[] = [
    {
      key: "employee",
      label: "Empleado",
      primary: true,
      subtitle: true,
      render: (i: any) => (
        <>
          {i.employees?.first_name} {i.employees?.last_name}
          <p className="text-xs text-muted-foreground">{i.employees?.document_number}</p>
        </>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (i: any) => <span className="capitalize">{i.tipo.replace(/_/g, ' ')}</span>,
    },
    {
      key: "start",
      label: "Inicio",
      render: (i: any) => format(safeNewDate(i.fecha_inicio), 'dd/MM/yyyy'),
    },
    {
      key: "end",
      label: "Fin",
      render: (i: any) => format(safeNewDate(i.fecha_fin), 'dd/MM/yyyy'),
    },
    {
      key: "cie10",
      label: "CIE-10",
      hideOnMobile: true,
      render: (i: any) => {
        const diags: Icd10Diagnosis[] = i.diagnosticos_json ?? (i.codigo_cie ? [{ code: i.codigo_cie, es: i.diagnostico || '', en: '' }] : []);
        if (diags.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {diags.slice(0, 2).map((d: Icd10Diagnosis) => (
              <Badge key={d.code} variant="outline" className="text-xs font-mono">{d.code}</Badge>
            ))}
            {diags.length > 2 && <Badge variant="outline" className="text-xs">+{diags.length - 2}</Badge>}
          </div>
        );
      },
    },
    { key: "days", label: "Días", render: (i: any) => i.dias },
    { key: "entity", label: "Entidad", hideOnMobile: true, render: (i: any) => i.entidad ?? '-' },
    { key: "status", label: "Estado", render: (i: any) => estadoBadge[i.estado] },
    {
      key: "origin",
      label: "Origen",
      hideOnMobile: true,
      render: (i: any) =>
        i.origen === 'portal_empleado' ? <Badge variant="outline">Empleado</Badge> : <Badge variant="outline">Admin</Badge>,
    },
  ];

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Incapacidades</h1>
            <p className="text-muted-foreground mt-1">Gestión de incapacidades médicas y licencias</p>
          </div>
          <Button className="gradient-primary" onClick={() => { setSelected(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva incapacidad
          </Button>
        </div>

        <Tabs defaultValue="gestion" className="space-y-6">
          <TabsList>
            <TabsTrigger value="gestion">Gestión</TabsTrigger>
            <TabsTrigger value="reportes">
              <BarChart3 className="h-4 w-4 mr-1" />
              Reportes CIE-10
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gestion" className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-card">
                <div className="rounded-lg bg-primary/10 p-3 text-primary"><FileText className="h-6 w-6" /></div>
                <div><p className="text-2xl font-bold">{incapacidades.length}</p><p className="text-sm text-muted-foreground">Total registros</p></div>
              </div>
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-card">
                <div className="rounded-lg bg-warning/10 p-3 text-warning"><AlertCircle className="h-6 w-6" /></div>
                <div><p className="text-2xl font-bold">{pendientes}</p><p className="text-sm text-muted-foreground">Pendientes de revisar</p></div>
              </div>
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-card">
                <div className="rounded-lg bg-success/10 p-3 text-success"><CheckCircle2 className="h-6 w-6" /></div>
                <div><p className="text-2xl font-bold">{aprobadas}</p><p className="text-sm text-muted-foreground">Aprobadas</p></div>
              </div>
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-card">
                <div className="rounded-lg bg-destructive/10 p-3 text-destructive"><HeartPulse className="h-6 w-6" /></div>
                <div><p className="text-2xl font-bold">{totalDias}</p><p className="text-sm text-muted-foreground">Días acumulados</p></div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Buscar empleado, código o diagnóstico CIE-10…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="registrada">Registrada</SelectItem>
                  <SelectItem value="en_revision">En revisión</SelectItem>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                  <SelectItem value="transcrita_nomina">Transcrita a nómina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-card">
              {isLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <ResponsiveTable
                  columns={columns}
                  data={filtered}
                  getKey={(i: any) => i.id}
                  emptyMessage="No hay incapacidades"
                  actions={(i: any) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(i); setShowForm(true); }}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        {i.documento_url && (
                          <DropdownMenuItem onClick={() => handleDownload(i.documento_url)}>
                            <Download className="h-4 w-4 mr-2" /> Descargar documento
                          </DropdownMenuItem>
                        )}
                        {i.estado !== 'transcrita_nomina' && (
                          <DropdownMenuItem onClick={() => transcribir.mutate(i.id)}>
                            <Calendar className="h-4 w-4 mr-2" /> Marcar transcrita a nómina
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelected(i); setShowDelete(true); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Diagnósticos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top 10 diagnósticos CIE-10
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topDiagnosticos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos de diagnósticos</p>
                  ) : (
                    <div className="space-y-3">
                      {topDiagnosticos.map((d, idx) => {
                        const maxCount = topDiagnosticos[0]?.count || 1;
                        const pct = (d.count / maxCount) * 100;
                        return (
                          <div key={d.code} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                                <Badge variant="outline" className="text-xs font-mono shrink-0">{d.code}</Badge>
                                <span className="truncate">{d.es}</span>
                              </div>
                              <span className="font-medium shrink-0 ml-2">{d.count} vez{d.count > 1 ? 'es' : ''} · {d.days}d</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reincidencia */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Empleados con reincidencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reincidencia.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin reincidencias detectadas</p>
                  ) : (
                    <div className="space-y-3">
                      {reincidencia.map((e, idx) => {
                        const maxCount = reincidencia[0]?.count || 1;
                        const pct = (e.count / maxCount) * 100;
                        return (
                          <div key={e.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                                <span className="truncate font-medium">{e.name}</span>
                              </div>
                              <span className="font-medium shrink-0 ml-2">{e.count} incapacidades · {e.days}d</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Resumen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen general</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{topDiagnosticos.length}</p>
                    <p className="text-sm text-muted-foreground">Diagnósticos únicos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reincidencia.length}</p>
                    <p className="text-sm text-muted-foreground">Empleados con reincidencia</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDias}</p>
                    <p className="text-sm text-muted-foreground">Días perdidos totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <IncapacidadForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setSelected(null); }}
        incapacidad={selected}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incapacidad?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selected && del.mutate(selected.id)}
            >
              {del.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
