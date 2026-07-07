import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GraduationCap, AlertTriangle, CheckCircle, Clock, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { safeNewDate } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

import { CursoForm } from "@/components/cursos/CursoForm";
import { CursoDetailDialog } from "@/components/cursos/CursoDetailDialog";
import { CursosTable } from "@/components/cursos/CursosTable";

interface CourseWithEmployee extends Tables<"courses"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

export default function Cursos() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<CourseWithEmployee | null>(null);

  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(`*, employees(first_name, last_name, document_number)`)
        .order("start_date", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CourseWithEmployee[];
    },
  });

  // Stats query
  const { data: allForStats } = useQuery({
    queryKey: ["courses-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("status");
      if (error) throw error;
      return data;
    },
  });

  const statsData = allForStats || [];
  const statsCompleted = statsData.filter((c) => c.status === "completado").length;
  const statsPending = statsData.filter((c) => c.status === "pendiente" || c.status === "en_progreso").length;
  const statsExpired = statsData.filter((c) => c.status === "vencido").length;

  const allCourses = courses || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses-stats"] });
      toast.success("Curso eliminado correctamente");
      setShowDeleteDialog(false);
      setSelected(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  // Export
  const handleExport = () => {
    if (!allCourses.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const exportData = allCourses.map((c) => ({
      Empleado: c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : "",
      Curso: c.course_name,
      Proveedor: c.provider || "",
      "Fecha Obtención": c.start_date ? format(safeNewDate(c.start_date), "dd/MM/yyyy") : "",
      Vencimiento: c.expiry_date ? format(safeNewDate(c.expiry_date), "dd/MM/yyyy") : "",
      "Duración (h)": c.duration_hours || "",
      Calificación: c.grade || "",
      Estado: c.status || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cursos");
    XLSX.writeFile(wb, `cursos_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Archivo exportado correctamente");
  };

  // Handlers
  const handleNew = () => { setSelected(null); setShowForm(true); };
  const handleEdit = (c: CourseWithEmployee) => { setSelected(c); setShowForm(true); };
  const handleViewDetails = (c: CourseWithEmployee) => { setSelected(c); setShowDetail(true); };
  const handleDelete = (c: CourseWithEmployee) => { setSelected(c); setShowDeleteDialog(true); };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cursos y Certificaciones</h1>
            <p className="mt-1 text-muted-foreground">
              Control de cursos obligatorios y fechas de renovación
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button className="gradient-primary" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Curso
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsData.length}</p>
              <p className="text-sm text-muted-foreground">Total registros</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-success/10 p-3 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsCompleted}</p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-warning/10 p-3 text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsPending}</p>
              <p className="text-sm text-muted-foreground">Pendientes / En progreso</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsExpired}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </div>
          </div>
        </div>

        {/* Tabs & Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="completado">Completados</TabsTrigger>
            <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="en_progreso">En progreso</TabsTrigger>
            <TabsTrigger value="vencido">Vencidos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <CursosTable
                courses={allCourses}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CursoForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelected(null);
        }}
        curso={selected}
      />

      <CursoDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        curso={selected}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro del curso será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
