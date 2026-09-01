import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GraduationCap, AlertTriangle, CheckCircle, Clock, Loader2, Download, BarChart3, Users, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Report analytics
  const courseReportData = useMemo(() => {
    const all = courses || [];
    const byProvider: Record<string, number> = {};
    const byStatus = { completado: 0, pendiente: 0, en_progreso: 0, vencido: 0 };
    let totalHours = 0;
    let hoursCount = 0;
    let expired = 0;
    const expiringSoon: typeof all = [];

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 86400000);

    for (const c of all) {
      if (c.provider) byProvider[c.provider] = (byProvider[c.provider] || 0) + 1;
      if (c.status && byStatus[c.status as keyof typeof byStatus] !== undefined) {
        byStatus[c.status as keyof typeof byStatus]++;
      }
      if (c.duration_hours) { totalHours += c.duration_hours; hoursCount++; }
      if (c.expiry_date) {
        const exp = new Date(c.expiry_date);
        if (exp < now) expired++;
        else if (exp <= thirtyDays) expiringSoon.push(c);
      }
    }

    const topProviders = Object.entries(byProvider).sort(([, a], [, b]) => b - a).slice(0, 5);
    const avgHours = hoursCount > 0 ? Math.round(totalHours / hoursCount) : 0;
    const completionRate = all.length > 0 ? Math.round((byStatus.completado / all.length) * 100) : 0;

    return { byStatus, topProviders, totalHours, avgHours, expired, expiringSoon: expiringSoon.slice(0, 10), completionRate };
  }, [courses]);

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
            <TabsTrigger value="reportes">
              <BarChart3 className="h-4 w-4 mr-1" />
              Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab !== 'reportes' ? activeTab : 'all'}>
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

          <TabsContent value="reportes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Estado de certificaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <p className="text-2xl font-bold text-success">{courseReportData.byStatus.completado}</p>
                      <p className="text-xs text-muted-foreground">Completados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-warning/10">
                      <p className="text-2xl font-bold text-warning">{courseReportData.byStatus.pendiente + courseReportData.byStatus.en_progreso}</p>
                      <p className="text-xs text-muted-foreground">En proceso</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/10">
                      <p className="text-2xl font-bold text-destructive">{courseReportData.expired}</p>
                      <p className="text-xs text-muted-foreground">Vencidos</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{courseReportData.totalHours}h</p>
                      <p className="text-xs text-muted-foreground">Total horas</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Badge className={courseReportData.completionRate >= 70 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                      Tasa de completación: {courseReportData.completionRate}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    Top proveedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courseReportData.topProviders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {courseReportData.topProviders.map(([provider, count], idx) => {
                        const max = courseReportData.topProviders[0]?.[1] || 1;
                        const pct = (count / max) * 100;
                        return (
                          <div key={provider} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{provider}</span>
                              </div>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {courseReportData.expiringSoon.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Certificados próximos a vencer (30 días)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {courseReportData.expiringSoon.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : 'Sin asignar'}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span className="truncate">{c.course_name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 ml-2">
                            {c.expiry_date ? format(safeNewDate(c.expiry_date), 'dd/MM/yyyy') : '—'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{allCourses.length}</p>
                    <p className="text-sm text-muted-foreground">Total cursos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{courseReportData.totalHours}h</p>
                    <p className="text-sm text-muted-foreground">Horas totales</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{courseReportData.avgHours}h</p>
                    <p className="text-sm text-muted-foreground">Promedio por curso</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{courseReportData.expired}</p>
                    <p className="text-sm text-muted-foreground">Certificados vencidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
