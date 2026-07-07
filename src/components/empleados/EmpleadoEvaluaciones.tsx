import { useQuery } from "@tanstack/react-query";
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
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { ClipboardCheck, Loader2, FileX } from "lucide-react";

interface EmpleadoEvaluacionesProps {
  employeeId: string;
}

const statusBadge: Record<string, React.ReactNode> = {
  completada: <Badge className="bg-success/10 text-success border-success/20">Completada</Badge>,
  pendiente: <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>,
  en_proceso: <Badge className="bg-primary/10 text-primary border-primary/20">En proceso</Badge>,
  cancelada: <Badge className="bg-muted text-muted-foreground">Cancelada</Badge>,
};

export function EmpleadoEvaluaciones({ employeeId }: EmpleadoEvaluacionesProps) {
  const { data: evaluations, isLoading } = useQuery({
    queryKey: ["employee-evaluations", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*, evaluation_templates(name, evaluation_type)")
        .eq("employee_id", employeeId)
        .order("evaluation_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    const parsed = parse(date, "yyyy-MM-dd", new Date());
    return format(parsed, "d MMM yyyy", { locale: es });
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Evaluaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!evaluations || evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileX className="h-12 w-12 mb-2" />
            <p>No hay evaluaciones registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((eval_: any) => (
                <TableRow key={eval_.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {eval_.evaluation_templates?.evaluation_type || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {eval_.evaluation_templates?.name || "-"}
                  </TableCell>
                  <TableCell>{eval_.period}</TableCell>
                  <TableCell>{formatDate(eval_.evaluation_date)}</TableCell>
                  <TableCell>
                    {eval_.overall_score ? (
                      <span className="font-semibold">{eval_.overall_score}%</span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {statusBadge[eval_.status || "pendiente"]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
