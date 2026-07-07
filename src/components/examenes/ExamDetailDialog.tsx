import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  Building,
  FileText,
  Stethoscope,
  ExternalLink,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface ExamWithEmployee extends Tables<"exams"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface ExamDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamWithEmployee | null;
}

const statusBadge: Record<string, React.ReactNode> = {
  vigente: (
    <Badge className="bg-success/10 text-success border-success/20">
      Completado
    </Badge>
  ),
  pendiente: (
    <Badge className="bg-warning/10 text-warning border-warning/20">
      Pendiente
    </Badge>
  ),
  vencido: (
    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
      Vencido
    </Badge>
  ),
  proximo_vencer: (
    <Badge className="bg-warning/10 text-warning border-warning/20">
      Por vencer
    </Badge>
  ),
};

export function ExamDetailDialog({
  open,
  onOpenChange,
  exam,
}: ExamDetailDialogProps) {
  if (!exam) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(safeNewDate(date), "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  const employeeName = exam.employees
    ? `${exam.employees.first_name} ${exam.employees.last_name}`
    : "Sin asignar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detalle del Examen Médico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Empleado</p>
              <p className="font-medium">{employeeName}</p>
              {exam.employees?.document_number && (
                <p className="text-sm text-muted-foreground">
                  {exam.employees.document_number}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Stethoscope className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Examen</p>
                <p className="font-medium">{exam.exam_type}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Entidad / IPS</p>
                <p className="font-medium">{exam.entity || "-"}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha Programada</p>
                <p className="font-medium">
                  {formatDate(exam.scheduled_date || exam.exam_date)}
                </p>
              </div>
            </div>

            {exam.expiry_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">{formatDate(exam.expiry_date)}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <div className="mt-1">
                {statusBadge[exam.status || "pendiente"]}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Resultado</p>
              <p className="font-medium mt-1">{exam.result || "-"}</p>
            </div>
          </div>

          {exam.observations && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Observaciones
                </p>
                <p className="text-sm">{exam.observations}</p>
              </div>
            </>
          )}

          {exam.document_url && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Documento adjunto
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={exam.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver documento
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
