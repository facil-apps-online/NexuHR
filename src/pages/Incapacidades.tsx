import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
import { Plus, Loader2, MoreHorizontal, Edit, Trash2, Download, FileText, HeartPulse, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { IncapacidadForm } from '@/components/incapacidades/IncapacidadForm';

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
      if (!name.includes(t) && !(i.diagnostico ?? '').toLowerCase().includes(t)) return false;
    }
    return true;
  }), [incapacidades, filterEstado, search]);

  const totalDias = incapacidades.reduce((acc: number, i: any) => acc + (i.dias ?? 0), 0);
  const pendientes = incapacidades.filter((i: any) => ['registrada', 'en_revision'].includes(i.estado)).length;
  const aprobadas = incapacidades.filter((i: any) => i.estado === 'aprobada' || i.estado === 'transcrita_nomina').length;

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

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage.from('incapacidades').createSignedUrl(path, 60);
    if (error) { toast.error('No se pudo descargar'); return; }
    window.open(data.signedUrl, '_blank');
  };

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
          <Input placeholder="Buscar empleado o diagnóstico…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
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
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No hay incapacidades</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.employees?.first_name} {i.employees?.last_name}
                      <p className="text-xs text-muted-foreground">{i.employees?.document_number}</p>
                    </TableCell>
                    <TableCell className="capitalize">{i.tipo.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{format(new Date(i.fecha_inicio), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(i.fecha_fin), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{i.dias}</TableCell>
                    <TableCell>{i.entidad ?? '-'}</TableCell>
                    <TableCell>{estadoBadge[i.estado]}</TableCell>
                    <TableCell>
                      {i.origen === 'portal_empleado' ? <Badge variant="outline">Empleado</Badge> : <Badge variant="outline">Admin</Badge>}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
