import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivoFijoForm } from "@/components/activos/ActivoFijoForm";
import { AsignarActivoDialog } from "@/components/activos/AsignarActivoDialog";
import { ActivoHistorial } from "@/components/activos/ActivoHistorial";
import {
  Monitor,
  Smartphone,
  Tablet,
  Printer,
  Package,
  Plus,
  Loader2,
  FileX,
  Edit,
  Trash2,
  History,
  UserPlus,
  UserX,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Activo = Tables<"activos_fijos">;
type LookupItem = { id: string; name: string };

const tipoIconMap: Record<string, typeof Monitor> = {
  Computador: Monitor,
  Celular: Smartphone,
  Tablet: Tablet,
  Monitor: Monitor,
  Impresora: Printer,
};

const defaultIcon = Package;

const estadoColor: Record<string, string> = {
  Disponible: "bg-success/10 text-success border-success/20",
  Asignado: "bg-primary/10 text-primary border-primary/20",
  "En reparación": "bg-warning/10 text-warning border-warning/20",
  "Dado de baja": "bg-destructive/10 text-destructive border-destructive/20",
};

const defaultColor = "bg-muted text-muted-foreground";

const columns: ResponsiveColumn<Activo>[] = [
  {
    key: "type",
    label: "Tipo",
    primary: true,
    render: (activo) => {
      const tipoNombre = (activo as any).activo_fijo_tipos?.name ?? "";
      const Icon = tipoIconMap[tipoNombre] ?? defaultIcon;
      return (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{tipoNombre}</span>
        </div>
      );
    },
  },
  {
    key: "brand",
    label: "Marca/Modelo",
    subtitle: true,
    className: "font-medium",
    render: (activo) => {
      const marcaNombre = (activo as any).activo_fijo_marcas?.name ?? "";
      return `${marcaNombre} ${activo.modelo}`;
    },
  },
  {
    key: "serial",
    label: "Serie",
    hideOnMobile: true,
    className: "text-muted-foreground",
    render: (activo) => activo.numero_serie || "-",
  },
  {
    key: "status",
    label: "Estado",
    render: (activo) => {
      const estadoNombre = (activo as any).activo_fijo_estados?.name ?? "";
      return <Badge className={estadoColor[estadoNombre] ?? defaultColor}>{estadoNombre}</Badge>;
    },
  },
  {
    key: "assignedTo",
    label: "Asignado a",
    render: (activo) =>
      activo.employees
        ? `${activo.employees.first_name} ${activo.employees.last_name}`
        : "-",
  },
  {
    key: "purchaseDate",
    label: "Fecha Compra",
    hideOnMobile: true,
    className: "text-muted-foreground",
    render: (activo) =>
      activo.fecha_compra
        ? format(new Date(activo.fecha_compra), "d MMM yyyy", { locale: es })
        : "-",
  },
  {
    key: "value",
    label: "Valor",
    hideOnMobile: true,
    render: (activo) =>
      activo.valor ? `$${Number(activo.valor).toLocaleString("es-CO")}` : "-",
  },
];

function useLookup(table: string) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("id, name").eq("active", true).order("name");
      return (data ?? []) as LookupItem[];
    },
  });
}

export default function ActivosFijos() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivo, setEditingActivo] = useState<Activo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assigningActivo, setAssigningActivo] = useState<Activo | null>(null);
  const [historyActivoId, setHistoryActivoId] = useState<string | null>(null);
  const [filtroTipoId, setFiltroTipoId] = useState("todos");
  const [filtroEstadoId, setFiltroEstadoId] = useState("todos");
  const queryClient = useQueryClient();

  const { data: tipos } = useLookup("activo_fijo_tipos");
  const { data: estados } = useLookup("activo_fijo_estados");

  const tipoNameMap = new Map(tipos?.map((t) => [t.id, t.name]) ?? []);
  const estadoNameMap = new Map(estados?.map((e) => [e.id, e.name]) ?? []);

  const { data: activos, isLoading } = useQuery({
    queryKey: ["activos-fijos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos")
        .select("*, activo_fijo_tipos!inner(name), activo_fijo_estados!inner(name), activo_fijo_marcas!inner(name), employees(first_name, last_name, document_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activos_fijos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo fijo eliminado");
      setDeleteId(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const unassignMutation = useMutation({
    mutationFn: async (activo: Activo) => {
      const { error } = await supabase
        .from("activos_fijos")
        .update({ empleado_asignado_id: null, estado_id: undefined, fecha_asignacion: null })
        .eq("id", activo.id);
      if (error) throw error;
      await supabase.from("activos_fijos_historial").insert({
        activo_fijo_id: activo.id,
        empleado_id: activo.empleado_asignado_id,
        tipo_evento: "devolucion",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Devolución registrada");
    },
    onError: () => toast.error("Error al registrar devolución"),
  });

  const repairMutation = useMutation({
    mutationFn: async (activo: Activo) => {
      const reparacion = estados?.find((e) => e.name === "En reparación");
      if (!reparacion) throw new Error("Estado 'En reparación' no encontrado");
      const { error } = await supabase
        .from("activos_fijos")
        .update({ estado_id: reparacion.id })
        .eq("id", activo.id);
      if (error) throw error;
      await supabase.from("activos_fijos_historial").insert({
        activo_fijo_id: activo.id,
        empleado_id: activo.empleado_asignado_id,
        tipo_evento: "reparacion",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo enviado a reparación");
    },
    onError: () => toast.error("Error al enviar a reparación"),
  });

  const disponibleId = estados?.find((e) => e.name === "Disponible")?.id;
  const asignadoNombre = "Asignado";

  const getEstado = (id: string) => estadoNameMap.get(id) ?? id;
  const getTipo = (id: string) => tipoNameMap.get(id) ?? id;

  const filtered = (activos ?? []).filter((a) => {
    if (filtroTipoId !== "todos" && a.tipo_id !== filtroTipoId) return false;
    if (filtroEstadoId !== "todos" && a.estado_id !== filtroEstadoId) return false;
    return true;
  });

  const stats = {
    total: activos?.length ?? 0,
    disponibles: activos?.filter((a) => getEstado(a.estado_id) === "Disponible").length ?? 0,
    asignados: activos?.filter((a) => getEstado(a.estado_id) === "Asignado").length ?? 0,
    enReparacion: activos?.filter((a) => getEstado(a.estado_id) === "En reparación").length ?? 0,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Activos Fijos</h1>
            <p className="mt-1 text-muted-foreground">
              Equipos de cómputo, celulares y otros activos asignados a empleados
            </p>
          </div>
          <Button className="gradient-primary" onClick={() => { setEditingActivo(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Activo
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total activos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-success/10 p-2">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.disponibles}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.asignados}</p>
                <p className="text-xs text-muted-foreground">Asignados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-warning/10 p-2">
                <Wrench className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{stats.enReparacion}</p>
                <p className="text-xs text-muted-foreground">En reparación</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-3">
          <Select value={filtroTipoId} onValueChange={setFiltroTipoId}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {(tipos ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstadoId} onValueChange={setFiltroEstadoId}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {(estados ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Listado de Activos</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <FileX className="mb-2 h-12 w-12" />
                <p>No hay activos registrados</p>
              </div>
            ) : (
              <ResponsiveTable
                columns={columns}
                data={filtered}
                getKey={(activo) => activo.id}
                actions={(activo) => {
                  const estadoNombre = (activo as any).activo_fijo_estados?.name ?? getEstado(activo.estado_id);
                  return (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setHistoryActivoId(activo.id)}
                        title="Historial"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {estadoNombre === "Disponible" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-primary"
                          onClick={() => setAssigningActivo(activo)}
                          title="Asignar"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      {estadoNombre === "Asignado" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-success"
                            onClick={() => unassignMutation.mutate(activo)}
                            title="Devolver"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-warning"
                            onClick={() => repairMutation.mutate(activo)}
                            title="Enviar a reparación"
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setEditingActivo(activo); setFormOpen(true); }}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => setDeleteId(activo.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ActivoFijoForm open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingActivo(null); }} activo={editingActivo} />

      {assigningActivo && (
        <AsignarActivoDialog
          open={!!assigningActivo}
          onOpenChange={() => setAssigningActivo(null)}
          activoId={assigningActivo.id}
          activoNombre={`${getTipo(assigningActivo.tipo_id)} ${(assigningActivo as any).activo_fijo_marcas?.name ?? ""} ${assigningActivo.modelo}`}
        />
      )}

      {historyActivoId && (
        <ActivoHistorial
          open={!!historyActivoId}
          onOpenChange={() => setHistoryActivoId(null)}
          activoId={historyActivoId}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar activo fijo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
