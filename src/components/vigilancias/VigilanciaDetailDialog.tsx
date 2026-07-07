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
import { ShieldCheck } from "lucide-react";

interface VigilanciaWithEmployee {
  id: string;
  vigilancia_type: string;
  diagnosis: string | null;
  start_date: string;
  end_date: string | null;
  follow_up_date: string | null;
  status: string | null;
  restrictions: string | null;
  recommendations: string | null;
  created_at: string | null;
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vigilancia: VigilanciaWithEmployee | null;
}

const statusBadge: Record<string, React.ReactNode> = {
  activa: <Badge className="bg-success/10 text-success border-success/20">Activa</Badge>,
  inactiva: <Badge className="bg-muted text-muted-foreground">Inactiva</Badge>,
  vencida: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencida</Badge>,
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return format(safeNewDate(date), "d MMM yyyy", { locale: es });
};

export function VigilanciaDetailDialog({ open, onOpenChange, vigilancia }: Props) {
  if (!vigilancia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Detalle de Vigilancia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Empleado</p>
              <p className="font-medium">
                {vigilancia.employees
                  ? `${vigilancia.employees.first_name} ${vigilancia.employees.last_name}`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <div className="mt-1">{statusBadge[vigilancia.status || "activa"]}</div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Tipo de Vigilancia</p>
            <p className="font-medium">{vigilancia.vigilancia_type}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Diagnóstico</p>
            <p className="font-medium">{vigilancia.diagnosis || "-"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
              <p className="font-medium">{formatDate(vigilancia.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próximo Seguimiento</p>
              <p className="font-medium">{formatDate(vigilancia.follow_up_date)}</p>
            </div>
          </div>

          {vigilancia.restrictions && (
            <div>
              <p className="text-sm text-muted-foreground">Restricciones</p>
              <p className="font-medium">{vigilancia.restrictions}</p>
            </div>
          )}

          {vigilancia.recommendations && (
            <div>
              <p className="text-sm text-muted-foreground">Recomendaciones</p>
              <p className="font-medium">{vigilancia.recommendations}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
