import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, Download, Loader2 } from "lucide-react";
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
          </TabsList>

          <TabsContent value={activeTab}>
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
