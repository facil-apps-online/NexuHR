import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AsignarActivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activoId: string;
  activoNombre: string;
}

export function AsignarActivoDialog({ open, onOpenChange, activoId, activoNombre }: AsignarActivoDialogProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["active-employees", search],
    queryFn: async () => {
      let q = supabase
        .from("employees")
        .select("id, first_name, last_name, document_number, email")
        .eq("estado", "activo")
        .order("first_name", { ascending: true });

      if (search) {
        q = q.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,document_number.ilike.%${search}%`
        );
      }

      const { data, error } = await q.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const assign = useMutation({
    mutationFn: async (empleadoId: string) => {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("activos_fijos")
        .update({ empleado_asignado_id: empleadoId, estado: "asignado", fecha_asignacion: now })
        .eq("id", activoId)
        .eq("estado", "disponible");
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("activos_fijos_historial")
        .insert({ activo_fijo_id: activoId, empleado_id: empleadoId, tipo_evento: "asignacion" });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo asignado correctamente");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("No se pudo asignar. El activo ya no está disponible.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Activo</DialogTitle>
          <DialogDescription>
            Busca y selecciona un empleado para asignarle <strong>{activoNombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : employees && employees.length > 0 ? (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-secondary/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {emp.document_number} {emp.email ? `· ${emp.email}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => assign.mutate(emp.id)}
                  disabled={assign.isPending}
                >
                  {assign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-success" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <X className="mb-2 h-8 w-8" />
              <p className="text-sm">No se encontraron empleados activos</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
