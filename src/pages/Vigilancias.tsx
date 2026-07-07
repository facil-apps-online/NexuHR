import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShieldCheck, Users, AlertTriangle, CheckCircle, Loader2, Download } from "lucide-react";
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
          </TabsList>

          <TabsContent value={activeTab}>
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
