import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, Download, Loader2, BarChart3, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
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

// Components
import { ExamForm } from "@/components/examenes/ExamForm";
import { ExamResultForm } from "@/components/examenes/ExamResultForm";
import { ExamVigilanciaForm } from "@/components/examenes/ExamVigilanciaForm";
import { ExamsTable } from "@/components/examenes/ExamsTable";
import { ExamDetailDialog } from "@/components/examenes/ExamDetailDialog";
import { ExamStats } from "@/components/examenes/ExamStats";

interface ExamWithEmployee extends Tables<"exams"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

export default function Examenes() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  
  // Modal states
  const [showExamForm, setShowExamForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showVigilanciaForm, setShowVigilanciaForm] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected exam
  const [selectedExam, setSelectedExam] = useState<ExamWithEmployee | null>(null);
  const [vigilanciaData, setVigilanciaData] = useState<{
    examId: string;
    employeeId: string;
    vigilanciaTypeId?: string;
  } | null>(null);

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("exams")
        .select(
          `
          *,
          employees (
            first_name,
            last_name,
            document_number
          )
        `
        )
        .order("scheduled_date", { ascending: false, nullsFirst: false });

      if (activeTab !== "all") {
        const typeMap: Record<string, string> = {
          ingreso: "Ingreso",
          periodico: "Periódico",
          retiro: "Retiro",
        };
        if (typeMap[activeTab]) {
          query = query.eq("exam_type", typeMap[activeTab]);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExamWithEmployee[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", examId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-stats"] });
      toast.success("Examen eliminado correctamente");
      setShowDeleteDialog(false);
      setSelectedExam(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  // Export to Excel
  const handleExport = () => {
    if (!exams || exams.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const exportData = exams.map((exam) => ({
      Empleado: exam.employees
        ? `${exam.employees.first_name} ${exam.employees.last_name}`
        : "Sin asignar",
      Documento: exam.employees?.document_number || "",
      "Tipo de Examen": exam.exam_type,
      Entidad: exam.entity || "",
      "Fecha Programada": exam.scheduled_date
        ? format(safeNewDate(exam.scheduled_date), "dd/MM/yyyy")
        : "",
      "Fecha Examen": exam.exam_date
        ? format(safeNewDate(exam.exam_date), "dd/MM/yyyy")
        : "",
      Vencimiento: exam.expiry_date
        ? format(safeNewDate(exam.expiry_date), "dd/MM/yyyy")
        : "",
      Estado: exam.status || "",
      Resultado: exam.result || "",
      Observaciones: exam.observations || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exámenes");

    // Set column widths
    ws["!cols"] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 40 },
    ];

    const fileName = `examenes_medicos_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Archivo exportado correctamente");
  };

  // Report analytics
  const allExams = exams || [];
  const examStats = useMemo(() => {
    const byType = { Ingreso: 0, Periódico: 0, Retiro: 0 };
    const byStatus = { pendiente: 0, vigente: 0, vencido: 0, proximo_vencer: 0 };
    const byEntity: Record<string, number> = {};
    let totalDays = 0;
    let countWithDates = 0;

    for (const e of allExams) {
      if (e.exam_type && byType[e.exam_type as keyof typeof byType] !== undefined) {
        byType[e.exam_type as keyof typeof byType]++;
      }
      if (e.status && byStatus[e.status as keyof typeof byStatus] !== undefined) {
        byStatus[e.status as keyof typeof byStatus]++;
      }
      if (e.entity) {
        byEntity[e.entity] = (byEntity[e.entity] || 0) + 1;
      }
      if (e.scheduled_date && e.exam_date) {
        const d1 = new Date(e.scheduled_date);
        const d2 = new Date(e.exam_date);
        totalDays += Math.abs(d2.getTime() - d1.getTime()) / 86400000;
        countWithDates++;
      }
    }

    const topEntities = Object.entries(byEntity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const avgDays = countWithDates > 0 ? Math.round(totalDays / countWithDates) : 0;
    const coverage = allExams.length > 0 ? Math.round(((byStatus.vigente || 0) / allExams.length) * 100) : 0;

    return { byType, byStatus, topEntities, avgDays, coverage };
  }, [allExams]);

  // Handlers
  const handleViewDetails = (exam: ExamWithEmployee) => {
    setSelectedExam(exam);
    setShowDetailDialog(true);
  };

  const handleEdit = (exam: ExamWithEmployee) => {
    setSelectedExam(exam);
    setShowExamForm(true);
  };

  const handleAddResult = (exam: ExamWithEmployee) => {
    setSelectedExam(exam);
    setShowResultForm(true);
  };

  const handleDelete = (exam: ExamWithEmployee) => {
    setSelectedExam(exam);
    setShowDeleteDialog(true);
  };

  const handleCreateVigilancia = (exam: ExamWithEmployee) => {
    setVigilanciaData({
      examId: exam.id,
      employeeId: exam.employee_id,
    });
    setShowVigilanciaForm(true);
  };


  const handleNewExam = () => {
    setSelectedExam(null);
    setShowExamForm(true);
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Exámenes Médicos</h1>
            <p className="mt-1 text-muted-foreground">
              Programación y seguimiento de exámenes ocupacionales
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button className="gradient-primary" onClick={handleNewExam}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Programar Examen
            </Button>
          </div>
        </div>

        {/* Stats */}
        <ExamStats />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
            <TabsTrigger value="periodico">Periódicos</TabsTrigger>
            <TabsTrigger value="retiro">Retiro</TabsTrigger>
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
              <ExamsTable
                exams={exams || []}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onAddResult={handleAddResult}
                onDelete={handleDelete}
                onCreateVigilancia={handleCreateVigilancia}
              />
            )}
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Distribución por tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(examStats.byType).map(([tipo, count]) => {
                      const pct = allExams.length > 0 ? Math.round((count / allExams.length) * 100) : 0;
                      return (
                        <div key={tipo} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{tipo}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Estado de exámenes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <p className="text-2xl font-bold text-success">{examStats.byStatus.vigente}</p>
                      <p className="text-xs text-muted-foreground">Vigentes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/10">
                      <p className="text-2xl font-bold text-destructive">{examStats.byStatus.vencido}</p>
                      <p className="text-xs text-muted-foreground">Vencidos</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-warning/10">
                      <p className="text-2xl font-bold text-warning">{examStats.byStatus.proximo_vencer}</p>
                      <p className="text-xs text-muted-foreground">Próximos a vencer</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{examStats.byStatus.pendiente}</p>
                      <p className="text-xs text-muted-foreground">Pendientes</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Badge className={examStats.coverage >= 80 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                      Cobertura vigente: {examStats.coverage}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    Top entidades realizadoras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {examStats.topEntities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {examStats.topEntities.map(([entity, count], idx) => {
                        const max = examStats.topEntities[0]?.[1] || 1;
                        const pct = (count / max) * 100;
                        return (
                          <div key={entity} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{entity}</span>
                              </div>
                              <span className="text-muted-foreground">{count} examen{count > 1 ? 'es' : ''}</span>
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
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{allExams.length}</p>
                    <p className="text-sm text-muted-foreground">Total exámenes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{examStats.avgDays}</p>
                    <p className="text-sm text-muted-foreground">Días promedio programado→realizado</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{examStats.coverage}%</p>
                    <p className="text-sm text-muted-foreground">Cobertura vigente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ExamForm
        open={showExamForm}
        onOpenChange={(open) => {
          setShowExamForm(open);
          if (!open) setSelectedExam(null);
        }}
        exam={selectedExam}
      />

      {selectedExam && (
        <ExamResultForm
          open={showResultForm}
          onOpenChange={(open) => {
            setShowResultForm(open);
            if (!open) setSelectedExam(null);
          }}
          exam={selectedExam}
        />
      )}

      {vigilanciaData && (
        <ExamVigilanciaForm
          open={showVigilanciaForm}
          onOpenChange={(open) => {
            setShowVigilanciaForm(open);
            if (!open) setVigilanciaData(null);
          }}
          examId={vigilanciaData.examId}
          employeeId={vigilanciaData.employeeId}
          defaultVigilanciaTypeId={vigilanciaData.vigilanciaTypeId}
        />
      )}

      <ExamDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        exam={selectedExam}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El examen será eliminado
              permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedExam && deleteMutation.mutate(selectedExam.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
