import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Loader2 } from "lucide-react";
import { EmpleadoInfoGeneral } from "@/components/empleados/EmpleadoInfoGeneral";
import { EmpleadoExamenes } from "@/components/empleados/EmpleadoExamenes";
import { EmpleadoCursos } from "@/components/empleados/EmpleadoCursos";
import { EmpleadoDotacion } from "@/components/empleados/EmpleadoDotacion";
import { EmpleadoVigilancias } from "@/components/empleados/EmpleadoVigilancias";
import { EmpleadoEvaluaciones } from "@/components/empleados/EmpleadoEvaluaciones";
import { EmpleadoComites } from "@/components/empleados/EmpleadoComites";
import { EmpleadoIncapacidades } from "@/components/empleados/EmpleadoIncapacidades";
import { PortalAccountActions } from "@/components/portal/PortalAccountActions";

export default function EmpleadoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!employee) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Empleado no encontrado</h2>
          <Button variant="link" onClick={() => navigate("/empleados")}>
            Volver a la lista
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/empleados")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="text-muted-foreground">
                  {employee.position || "Sin cargo"} • {employee.department || "Sin área"}
                </p>
              </div>
            </div>
          </div>
          <Button className="gradient-primary">
            <Edit className="mr-2 h-4 w-4" />
            Editar Empleado
          </Button>
        </div>

        {/* Tabs with all information */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="examenes">Exámenes Médicos</TabsTrigger>
            <TabsTrigger value="cursos">Cursos y Capacitaciones</TabsTrigger>
            <TabsTrigger value="dotacion">Dotación</TabsTrigger>
            <TabsTrigger value="vigilancias">Vigilancias</TabsTrigger>
            <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
            <TabsTrigger value="comites">Comités</TabsTrigger>
            <TabsTrigger value="incapacidades">Incapacidades</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <PortalAccountActions employeeId={employee.id} documentNumber={employee.document_number} />
            <EmpleadoInfoGeneral employee={employee} />
          </TabsContent>

          <TabsContent value="examenes">
            <EmpleadoExamenes employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="cursos">
            <EmpleadoCursos employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="dotacion">
            <EmpleadoDotacion employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="vigilancias">
            <EmpleadoVigilancias employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="evaluaciones">
            <EmpleadoEvaluaciones employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="comites">
            <EmpleadoComites employeeId={employee.id} />
          </TabsContent>

          <TabsContent value="incapacidades">
            <EmpleadoIncapacidades employeeId={employee.id} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
