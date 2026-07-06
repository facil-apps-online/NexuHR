import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreVertical,
  FileText,
  Edit,
  Trash2,
  HeartPulse,
  Send,
  ExternalLink,
} from "lucide-react";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import type { Tables } from "@/integrations/supabase/types";

interface ExamWithEmployee extends Tables<"exams"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface ExamsTableProps {
  exams: ExamWithEmployee[];
  onViewDetails: (exam: ExamWithEmployee) => void;
  onEdit: (exam: ExamWithEmployee) => void;
  onAddResult: (exam: ExamWithEmployee) => void;
  onDelete: (exam: ExamWithEmployee) => void;
  onCreateVigilancia: (exam: ExamWithEmployee) => void;
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

const typeBadge: Record<string, string> = {
  Ingreso: "bg-primary/10 text-primary border-primary/20",
  Periódico: "bg-info/10 text-info border-info/20",
  Retiro: "bg-muted text-muted-foreground border-muted",
  Reintegro: "bg-accent/50 text-accent-foreground border-accent/20",
  "Por cambio de puesto": "bg-secondary text-secondary-foreground border-secondary/20",
};

export function ExamsTable({
  exams,
  onViewDetails,
  onEdit,
  onAddResult,
  onDelete,
  onCreateVigilancia,
}: ExamsTableProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const showVigilanciaOption = (result: string | null) => {
    if (!result) return false;
    const vigilanciaResults = [
      "Apto con restricciones",
      "No apto temporal",
      "No apto definitivo",
    ];
    return vigilanciaResults.includes(result);
  };

  const columns: ResponsiveColumn<ExamWithEmployee>[] = [
    {
      key: "employee",
      label: "Empleado",
      primary: true,
      subtitle: true,
      render: (exam) =>
        exam.employees
          ? `${exam.employees.first_name} ${exam.employees.last_name}`
          : "Sin asignar",
    },
    {
      key: "type",
      label: "Tipo",
      render: (exam) => (
        <Badge className={typeBadge[exam.exam_type] || typeBadge["Periódico"]}>
          {exam.exam_type}
        </Badge>
      ),
    },
    {
      key: "entity",
      label: "Entidad",
      render: (exam) => (
        <span className="text-muted-foreground">{exam.entity || "-"}</span>
      ),
    },
    {
      key: "date",
      label: "Fecha",
      render: (exam) => formatDate(exam.scheduled_date || exam.exam_date),
    },
    {
      key: "status",
      label: "Estado",
      render: (exam) => statusBadge[exam.status || "pendiente"],
    },
    {
      key: "result",
      label: "Resultado",
      hideOnMobile: true,
      render: (exam) =>
        exam.result ? (
          <span className="font-medium">{exam.result}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  const actions = (exam: ExamWithEmployee) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(exam)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        {exam.status !== "vigente" && (
          <DropdownMenuItem onClick={() => onEdit(exam)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        {!exam.result && exam.status !== "vigente" && (
          <DropdownMenuItem onClick={() => onAddResult(exam)}>
            <FileText className="mr-2 h-4 w-4" />
            Registrar resultado
          </DropdownMenuItem>
        )}
        {exam.document_url && (
          <DropdownMenuItem asChild>
            <a
              href={exam.document_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver documento
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {showVigilanciaOption(exam.result) && (
          <DropdownMenuItem onClick={() => onCreateVigilancia(exam)}>
            <HeartPulse className="mr-2 h-4 w-4" />
            Crear vigilancia
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <Send className="mr-2 h-4 w-4" />
          Enviar recordatorio
        </DropdownMenuItem>
        {exam.status !== "vigente" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(exam)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={exams}
      getKey={(exam) => exam.id}
      actions={actions}
      emptyMessage="No hay exámenes registrados"
    />
  );
}
