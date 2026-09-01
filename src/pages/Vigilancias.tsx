import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShieldCheck, Users, AlertTriangle, CheckCircle, Loader2, Download, BarChart3, Clock } from "lucide-react";
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

import { VigilanciaForm } from "@/components/vigilancias/VigilanciaForm";
import { VigilanciaDetailDialog } from "@/components/vigilancias/VigilanciaDetailDialog";
import { VigilanciasTable } from "@/components/vigilancias/VigilanciasTable";

interface VigilanciaWithEmployee extends Tables<"vigilancias"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

export default function Vigilancias() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<VigilanciaWithEmployee | null>(null);

  // Fetch vigilancias
  const { data: vigilancias, isLoading } = useQuery({
    queryKey: ["vigilancias", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("vigilancias")
        .select(`*, employees(first_name, last_name, document_number)`)
        .order("start_date", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab as "activa" | "inactiva" | "vencida");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VigilanciaWithEmployee[];
    },
  });

  // Stats
  const allVigilancias = vigilancias || [];
  const activeCount = allVigilancias.filter((v) => v.status === "activa").length;
  const inactiveCount = allVigilancias.filter((v) => v.status === "inactiva").length;
  const expiredCount = allVigilancias.filter((v) => v.status === "vencida").length;
  // For "all" tab, compute from all; for filtered tabs use current list length
  const totalPrograms = activeTab === "all" ? allVigilancias.length : allVigilancias.length;

  // Fetch all for stats when on filtered tab
  const { data: allForStats } = useQuery({
    queryKey: ["vigilancias-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vigilancias")
        .select("status");
      if (error) throw error;
      return data;
    },
  });

  const statsData = allForStats || allVigilancias;
  const statsActive = statsData.filter((v) => v.status === "activa").length;
  const statsInactive = statsData.filter((v) => v.status === "inactiva").length;
  const statsExpired = statsData.filter((v) => v.status === "vencida").length;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vigilancias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vigilancias"] });
      toast.success("Vigilancia eliminada correctamente");
      setShowDeleteDialog(false);
      setSelected(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  // Change status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vigilancias")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vigilancias"] });
      toast.success("Estado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al cambiar estado: " + error.message);
    },
  });

  // Export
  const handleExport = () => {
    if (!allVigilancias.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const exportData = allVigilancias.map((v) => ({
      Empleado: v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : "",
      "Tipo de Vigilancia": v.vigilancia_type,
      Diagnóstico: v.diagnosis || "",
      "Fecha Inicio": v.start_date ? format(safeNewDate(v.start_date), "dd/MM/yyyy") : "",
      "Próximo Seguimiento": v.follow_up_date ? format(safeNewDate(v.follow_up_date), "dd/MM/yyyy") : "",
      Estado: v.status || "",
      Restricciones: v.restrictions || "",
      Recomendaciones: v.recommendations || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vigilancias");
    XLSX.writeFile(wb, `vigilancias_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Archivo exportado correctamente");
  };

  // Report analytics
  const vigilanciaReport = useMemo(() => {
    const all = vigilancias || [];
    const byType: Record<string, number> = {};
    const followUpPending: typeof all = [];
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 86400000);

    for (const v of all) {
      if (v.vigilancia_type) byType[v.vigilancia_type] = (byType[v.vigilancia_type] || 0) + 1;
      if (v.follow_up_date && v.status === 'activa') {
        const fup = new Date(v.follow_up_date);
        if (fup <= sevenDays) followUpPending.push(v);
      }
    }

    const topTypes = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 8);
    return { byType, topTypes, followUpPending: followUpPending.slice(0, 10) };
  }, [vigilancias]);

  // Handlers
  const handleNew = () => { setSelected(null); setShowForm(true); };
  const handleEdit = (v: VigilanciaWithEmployee) => { setSelected(v); setShowForm(true); };
  const handleViewDetails = (v: VigilanciaWithEmployee) => { setSelected(v); setShowDetail(true); };
  const handleDelete = (v: VigilanciaWithEmployee) => { setSelected(v); setShowDeleteDialog(true); };
  const handleChangeStatus = (v: VigilanciaWithEmployee, status: "activa" | "inactiva" | "vencida") => {
    statusMutation.mutate({ id: v.id, status });
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vigilancias Epidemiológicas</h1>
            <p className="mt-1 text-muted-foreground">
              Control y seguimiento de programas de vigilancia en salud
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button className="gradient-primary" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Vigilancia
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-6 w-6" />
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
              <p className="text-2xl font-bold">{statsActive}</p>
              <p className="text-sm text-muted-foreground">Activas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-warning/10 p-3 text-warning">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsInactive}</p>
              <p className="text-sm text-muted-foreground">Inactivas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsExpired}</p>
              <p className="text-sm text-muted-foreground">Vencidas</p>
            </div>
          </div>
        </div>

        {/* Tabs & Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="activa">Activas</TabsTrigger>
            <TabsTrigger value="inactiva">Inactivas</TabsTrigger>
            <TabsTrigger value="vencida">Vencidas</TabsTrigger>
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
              <VigilanciasTable
                vigilancias={allVigilancias}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onChangeStatus={handleChangeStatus}
              />
            )}
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Distribución por tipo de vigilancia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vigilanciaReport.topTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {vigilanciaReport.topTypes.map(([type, count], idx) => {
                        const max = vigilanciaReport.topTypes[0]?.[1] || 1;
                        const pct = (count / max) * 100;
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{type}</span>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-5 w-5 text-success" />
                    Estado actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <p className="text-2xl font-bold text-success">{statsActive}</p>
                      <p className="text-xs text-muted-foreground">Activas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{statsInactive}</p>
                      <p className="text-xs text-muted-foreground">Inactivas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/10">
                      <p className="text-2xl font-bold text-destructive">{statsExpired}</p>
                      <p className="text-xs text-muted-foreground">Vencidas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{statsData.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Badge className={statsActive > 0 ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}>
                      {statsData.length > 0 ? Math.round((statsActive / statsData.length) * 100) : 0}% activas
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {vigilanciaReport.followUpPending.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-5 w-5 text-warning" />
                      Seguimientos próximos (7 días)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {vigilanciaReport.followUpPending.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : 'Sin asignar'}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span className="truncate">{v.vigilancia_type}</span>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 ml-2">
                            {v.follow_up_date ? format(safeNewDate(v.follow_up_date), 'dd/MM/yyyy') : '—'}
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
                <div className="grid gap-4 sm:grid-cols-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{statsData.length}</p>
                    <p className="text-sm text-muted-foreground">Total vigilancias</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vigilanciaReport.topTypes.length}</p>
                    <p className="text-sm text-muted-foreground">Tipos diferentes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vigilanciaReport.followUpPending.length}</p>
                    <p className="text-sm text-muted-foreground">Seguimientos pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <VigilanciaForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelected(null);
        }}
        vigilancia={selected}
      />

      <VigilanciaDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        vigilancia={selected}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vigilancia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La vigilancia será eliminada permanentemente.
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
