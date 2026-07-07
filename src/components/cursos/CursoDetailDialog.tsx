import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface CourseWithEmployee extends Tables<"courses"> {
  employees?: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface CursoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: CourseWithEmployee | null;
}

const statusBadge: Record<string, React.ReactNode> = {
  completado: <Badge className="bg-success/10 text-success border-success/20">Completado</Badge>,
  pendiente: <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>,
  en_progreso: <Badge className="bg-primary/10 text-primary border-primary/20">En progreso</Badge>,
  vencido: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>,
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return format(safeNewDate(date), "d MMM yyyy", { locale: es });
};

export function CursoDetailDialog({ open, onOpenChange, curso }: CursoDetailDialogProps) {
  if (!curso) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del Curso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {curso.employees && (
            <div>
              <p className="text-sm text-muted-foreground">Empleado</p>
              <p className="font-medium">{curso.employees.first_name} {curso.employees.last_name}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Curso</p>
            <p className="font-medium">{curso.course_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="font-medium">{curso.provider || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              {statusBadge[curso.status || "pendiente"]}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha Obtención</p>
              <p className="font-medium">{formatDate(curso.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha Vencimiento</p>
              <p className="font-medium">{formatDate(curso.expiry_date)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Duración</p>
              <p className="font-medium">{curso.duration_hours ? `${curso.duration_hours} horas` : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calificación</p>
              <p className="font-medium">{curso.grade ? `${curso.grade}%` : "-"}</p>
            </div>
          </div>
          {curso.observations && (
            <div>
              <p className="text-sm text-muted-foreground">Observaciones</p>
              <p className="font-medium">{curso.observations}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
