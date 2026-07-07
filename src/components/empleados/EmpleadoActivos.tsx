import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Monitor, Smartphone, Tablet, Printer, Package, Loader2, FileX, Plus, Check, Search, X } from "lucide-react";
import { safeNewDate } from "@/lib/utils";
import { toast } from "sonner";

interface EmpleadoActivosProps {
  employeeId: string;
}

function useLookup(table: string) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("id, name").eq("active", true).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

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

export function EmpleadoActivos({ employeeId }: EmpleadoActivosProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: tipos } = useLookup("activo_fijo_tipos");
  const { data: estados } = useLookup("activo_fijo_estados");
  const { data: marcas } = useLookup("activo_fijo_marcas");

  const tipoNameMap = new Map(tipos?.map((t) => [t.id, t.name]) ?? []);
  const estadoNameMap = new Map(estados?.map((e) => [e.id, e.name]) ?? []);
  const marcaNameMap = new Map(marcas?.map((m) => [m.id, m.name]) ?? []);

  const { data: activos, isLoading } = useQuery({
    queryKey: ["employee-activos", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos")
        .select("*, activo_fijo_tipos!inner(name), activo_fijo_estados!inner(name), activo_fijo_marcas!inner(name)")
        .eq("empleado_asignado_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: disponibles } = useQuery({
    queryKey: ["activos-disponibles", search],
    queryFn: async () => {
      const disponible = estados?.find((e) => e.name === "Disponible");
      if (!disponible) return [];
      let q = supabase
        .from("activos_fijos")
        .select("id, tipo_id, marca_id, modelo, numero_serie")
        .eq("estado_id", disponible.id)
        .order("created_at", { ascending: false });

      if (search) {
        q = q.or(
          `modelo.ilike.%${search}%,numero_serie.ilike.%${search}%`
        );
      }

      const { data, error } = await q.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: assignOpen && !!estados,
  });

  const assign = useMutation({
    mutationFn: async (activoId: string) => {
      const asignado = estados?.find((e) => e.name === "Asignado");
      if (!asignado) throw new Error("Estado 'Asignado' no encontrado");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("activos_fijos")
        .update({ empleado_asignado_id: employeeId, estado_id: asignado.id, fecha_asignacion: now })
        .eq("id", activoId);
      if (error) throw error;

      await supabase.from("activos_fijos_historial").insert({
        activo_fijo_id: activoId,
        empleado_id: employeeId,
        tipo_evento: "asignacion",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-activos", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["activos-disponibles"] });
      toast.success("Activo asignado correctamente");
    },
    onError: () => toast.error("No se pudo asignar el activo"),
  });

  const getTipo = (id: string) => tipoNameMap.get(id) ?? id;
  const getEstado = (id: string) => estadoNameMap.get(id) ?? id;
  const getMarca = (id: string) => marcaNameMap.get(id) ?? "";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Activos Fijos Asignados
          </CardTitle>
          <Button size="sm" className="gradient-primary" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Asignar Activo
          </Button>
        </CardHeader>
        <CardContent>
          {!activos || activos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileX className="mb-2 h-12 w-12" />
              <p>No hay activos asignados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Asignación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activos.map((activo) => {
                  const tipoNombre = (activo as any).activo_fijo_tipos?.name ?? getTipo(activo.tipo_id);
                  const estadoNombre = (activo as any).activo_fijo_estados?.name ?? getEstado(activo.estado_id);
                  const marcaNombre = (activo as any).activo_fijo_marcas?.name ?? getMarca(activo.marca_id);
                  const Icon = tipoIconMap[tipoNombre] ?? defaultIcon;
                  return (
                    <TableRow key={activo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{tipoNombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {marcaNombre} {activo.modelo}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {activo.numero_serie || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColor[estadoNombre] ?? defaultColor}>
                          {estadoNombre}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {activo.fecha_asignacion
                          ? safeNewDate(activo.fecha_asignacion).toLocaleDateString("es-CO")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Activo al Empleado</DialogTitle>
            <DialogDescription>Selecciona un activo disponible para asignarlo</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por modelo o serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {disponibles && disponibles.length > 0 ? (
              disponibles.map((activo) => {
                const tipoNombre = getTipo(activo.tipo_id);
                const marcaNombre = getMarca(activo.marca_id);
                return (
                  <div
                    key={activo.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {tipoNombre} — {marcaNombre} {activo.modelo}
                      </p>
                      {activo.numero_serie && (
                        <p className="text-xs text-muted-foreground">Serie: {activo.numero_serie}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => assign.mutate(activo.id)}
                      disabled={assign.isPending}
                    >
                      {assign.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-success" />
                      )}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <X className="mb-2 h-8 w-8" />
                <p className="text-sm">No hay activos disponibles</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
