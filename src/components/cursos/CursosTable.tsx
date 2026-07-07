import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { MoreHorizontal, Eye, Edit, Trash2, Search, FileX } from "lucide-react";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

interface CourseWithEmployee extends Tables<"courses"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

interface CursosTableProps {
  courses: CourseWithEmployee[];
  onViewDetails: (course: CourseWithEmployee) => void;
  onEdit: (course: CourseWithEmployee) => void;
  onDelete: (course: CourseWithEmployee) => void;
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

const columns: ResponsiveColumn<CourseWithEmployee>[] = [
  {
    key: "employee",
    label: "Empleado",
    primary: true,
    subtitle: true,
    render: (c) =>
      c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : "-",
  },
  { key: "course", label: "Curso", render: (c) => c.course_name },
  { key: "provider", label: "Entidad", render: (c) => c.provider || "-" },
  {
    key: "startDate",
    label: "Fecha Obtención",
    render: (c) => formatDate(c.start_date),
  },
  {
    key: "expiry",
    label: "Vencimiento",
    hideOnMobile: true,
    render: (c) => formatDate(c.expiry_date),
  },
  {
    key: "status",
    label: "Estado",
    render: (c) => statusBadge[c.status || "pendiente"],
  },
];

export function CursosTable({ courses, onViewDetails, onEdit, onDelete }: CursosTableProps) {
  const [search, setSearch] = useState("");

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const empName = c.employees ? `${c.employees.first_name} ${c.employees.last_name}`.toLowerCase() : "";
    return (
      empName.includes(q) ||
      c.course_name.toLowerCase().includes(q) ||
      (c.provider || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Registro de Cursos</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por empleado, curso o proveedor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileX className="h-12 w-12 mb-2" />
            <p>{search ? "No se encontraron resultados" : "No hay cursos registrados"}</p>
          </div>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={filtered}
            getKey={(c) => c.id}
            actions={(curso) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(curso)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(curso)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(curso)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
