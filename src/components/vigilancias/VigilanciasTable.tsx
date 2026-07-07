import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveTable,
  ResponsiveColumn,
} from "@/components/ui/responsive-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface VigilanciaWithEmployee extends Tables<"vigilancias"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface Props {
  vigilancias: VigilanciaWithEmployee[];
  onViewDetails: (v: VigilanciaWithEmployee) => void;
  onEdit: (v: VigilanciaWithEmployee) => void;
  onDelete: (v: VigilanciaWithEmployee) => void;
  onChangeStatus: (v: VigilanciaWithEmployee, status: "activa" | "inactiva" | "vencida") => void;
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

export function VigilanciasTable({ vigilancias, onViewDetails, onEdit, onDelete, onChangeStatus }: Props) {
  const columns: ResponsiveColumn<VigilanciaWithEmployee>[] = [
    {
      key: "employee",
      label: "Empleado",
      primary: true,
      subtitle: true,
      render: (v) => v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : "-",
    },
    {
      key: "type",
      label: "Tipo",
      render: (v) => v.vigilancia_type,
    },
    {
      key: "diagnosis",
      label: "Diagnóstico",
      render: (v) => v.diagnosis || "-",
    },
    {
      key: "startDate",
      label: "Fecha Inicio",
      render: (v) => formatDate(v.start_date),
    },
    {
      key: "followUp",
      label: "Próximo Seguimiento",
      hideOnMobile: true,
      render: (v) => formatDate(v.follow_up_date),
    },
    {
      key: "status",
      label: "Estado",
      render: (v) => statusBadge[v.status || "activa"],
    },
  ];

  const actions = (v: VigilanciaWithEmployee) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(v)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(v)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        {v.status === "activa" && (
          <DropdownMenuItem onClick={() => onChangeStatus(v, "inactiva")}>
            <XCircle className="mr-2 h-4 w-4" />
            Marcar inactiva
          </DropdownMenuItem>
        )}
        {v.status !== "activa" && (
          <DropdownMenuItem onClick={() => onChangeStatus(v, "activa")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Reactivar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(v)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={vigilancias}
      getKey={(v) => v.id}
      actions={actions}
      emptyMessage="No hay vigilancias registradas"
    />
  );
}
