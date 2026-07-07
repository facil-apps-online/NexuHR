import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { Loader2, CircleDot, ArrowRightLeft, Wrench, Trash2 } from "lucide-react";

const eventConfig = {
  asignacion: { icon: ArrowRightLeft, color: "text-primary", label: "Asignación" },
  devolucion: { icon: CircleDot, color: "text-success", label: "Devolución" },
  reparacion: { icon: Wrench, color: "text-warning", label: "Reparación" },
  baja: { icon: Trash2, color: "text-destructive", label: "Baja" },
};

interface ActivoHistorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activoId: string;
}

export function ActivoHistorial({ open, onOpenChange, activoId }: ActivoHistorialProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["activo-historial", activoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos_historial")
        .select("*, employees(first_name, last_name)")
        .eq("activo_fijo_id", activoId)
        .order("fecha_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!activoId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historial del Activo</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-0">
            {events.map((ev, i) => {
              const config = eventConfig[ev.tipo_evento as keyof typeof eventConfig] ?? eventConfig.asignacion;
              const Icon = config.icon;
              const isLast = i === events.length - 1;
              return (
                <div key={ev.id} className="relative flex gap-4 pb-6">
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                  )}
                  <div className={`z-10 rounded-full border-2 border-background bg-card p-2 ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(safeNewDate(ev.fecha_evento), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                    {ev.descripcion && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{ev.descripcion}</p>
                    )}
                    {ev.employees && (
                      <p className="text-xs text-muted-foreground">
                        {ev.employees.first_name} {ev.employees.last_name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin eventos registrados
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
