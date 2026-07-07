import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Stethoscope, 
  Loader2, 
  FileX, 
  Plus, 
  MoreHorizontal,
  Eye,
  FileEdit,
  ClipboardCheck,
  AlertTriangle,
  Trash2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { ExamForm } from "@/components/examenes/ExamForm";
import { ExamResultForm } from "@/components/examenes/ExamResultForm";
import { ExamVigilanciaForm } from "@/components/examenes/ExamVigilanciaForm";
import { ExamDetailDialog } from "@/components/examenes/ExamDetailDialog";
import type { Tables } from "@/integrations/supabase/types";

interface EmpleadoExamenesProps {
  employeeId: string;
}

interface ExamWithEmployee extends Tables<"exams"> {
  employees: {
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
}

const statusBadge: Record<string, React.ReactNode> = {
  vigente: <Badge className="bg-success/10 text-success border-success/20">Vigente</Badge>,
  pendiente: <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>,
  vencido: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>,
  proximo_vencer: <Badge className="bg-warning/10 text-warning border-warning/20">Por vencer</Badge>,
};

export function EmpleadoExamenes({ employeeId }: EmpleadoExamenesProps) {
  const queryClient = useQueryClient();
  
  // Modal states
  const [showExamForm, setShowExamForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showVigilanciaForm, setShowVigilanciaForm] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected exam
  const [selectedExam, setSelectedExam] = useState<ExamWithEmployee | null>(null);
  const [vigilanciaTypeId, setVigilanciaTypeId] = useState<string | undefined>(undefined);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["employee-exams", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`
          *,
          employees (
            first_name,
            last_name,
            document_number
          )
        `)
        .eq("employee_id", employeeId)
        .order("exam_date", { ascending: false });

      if (error) throw error;
      return data as ExamWithEmployee[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", examId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-exams", employeeId] });
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

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    const parsed = parse(date, "yyyy-MM-dd", new Date());
    return format(parsed, "d MMM yyyy", { locale: es });
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
    setSelectedExam(exam);
    setShowVigilanciaForm(true);
  };


  const handleNewExam = () => {
    setSelectedExam(null);
    setShowExamForm(true);
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Historial de Exámenes Médicos
          </CardTitle>
          <Button size="sm" className="gradient-primary" onClick={handleNewExam}>
            <Plus className="mr-2 h-4 w-4" />
            Programar Examen
          </Button>
        </CardHeader>
        <CardContent>
          {!exams || exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2" />
              <p>No hay exámenes registrados</p>
              <Button variant="link" onClick={handleNewExam}>
                Programar primer examen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Examen</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Fecha Examen</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.exam_type}</TableCell>
                    <TableCell>{exam.entity || "-"}</TableCell>
                    <TableCell>{formatDate(exam.scheduled_date)}</TableCell>
                    <TableCell>{formatDate(exam.exam_date)}</TableCell>
                    <TableCell>{formatDate(exam.expiry_date)}</TableCell>
                    <TableCell>{exam.result || "-"}</TableCell>
                    <TableCell>
                      {statusBadge[exam.status || "pendiente"]}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(exam)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          {exam.document_url && (
                            <DropdownMenuItem asChild>
                              <a href={exam.document_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver documento
                              </a>
                            </DropdownMenuItem>
                          )}
                          {exam.status !== "vigente" && (
                            <DropdownMenuItem onClick={() => handleEdit(exam)}>
                              <FileEdit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {!exam.result && exam.status !== "vigente" && (
                            <DropdownMenuItem onClick={() => handleAddResult(exam)}>
                              <ClipboardCheck className="mr-2 h-4 w-4" />
                              Registrar resultado
                            </DropdownMenuItem>
                          )}
                          {exam.result && (
                            <DropdownMenuItem onClick={() => handleCreateVigilancia(exam)}>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Crear vigilancia
                            </DropdownMenuItem>
                          )}
                          {exam.status !== "vigente" && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(exam)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExamForm
        open={showExamForm}
        onOpenChange={(open) => {
          setShowExamForm(open);
          if (!open) setSelectedExam(null);
        }}
        exam={selectedExam}
        defaultEmployeeId={employeeId}
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

      {selectedExam && (
        <ExamVigilanciaForm
          open={showVigilanciaForm}
          onOpenChange={(open) => {
            setShowVigilanciaForm(open);
            if (!open) {
              setSelectedExam(null);
              setVigilanciaTypeId(undefined);
            }
          }}
          examId={selectedExam.id}
          employeeId={selectedExam.employee_id}
          defaultVigilanciaTypeId={vigilanciaTypeId}
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
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
