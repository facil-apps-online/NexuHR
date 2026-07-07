import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Users, Loader2, FileX, Plus } from "lucide-react";
import { AddEmployeeToComiteForm } from "@/components/comites/AddEmployeeToComiteForm";

interface EmpleadoComitesProps {
  employeeId: string;
}

export function EmpleadoComites({ employeeId }: EmpleadoComitesProps) {
  const [showForm, setShowForm] = useState(false);

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["employee-committees", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_members")
        .select(`
          *,
          committee:committees(*)
        `)
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: false });

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Participación en Comités
        </CardTitle>
        <Button size="sm" className="gradient-primary" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar a Comité
        </Button>
      </CardHeader>
      <CardContent>
        {!memberships || memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileX className="h-12 w-12 mb-2" />
            <p>No participa en ningún comité</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comité</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.committee?.name || "Comité no encontrado"}
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{formatDate(member.start_date)}</TableCell>
                  <TableCell>{formatDate(member.end_date)}</TableCell>
                  <TableCell>
                    {member.active ? (
                      <Badge className="bg-success/10 text-success border-success/20">Activo</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AddEmployeeToComiteForm
        open={showForm}
        onOpenChange={setShowForm}
        employeeId={employeeId}
      />
    </Card>
  );
}
