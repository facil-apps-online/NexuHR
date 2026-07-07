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
  DropdownMenuSeparator,
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
import { GraduationCap, Loader2, FileX, Plus, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CursoForm } from "@/components/cursos/CursoForm";
import { CursoDetailDialog } from "@/components/cursos/CursoDetailDialog";

interface EmpleadoCursosProps {
  employeeId: string;
}

const statusBadge: Record<string, React.ReactNode> = {
  completado: <Badge className="bg-success/10 text-success border-success/20">Completado</Badge>,
  pendiente: <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>,
  en_progreso: <Badge className="bg-primary/10 text-primary border-primary/20">En progreso</Badge>,
  vencido: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>,
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  return format(parsed, "d MMM yyyy", { locale: es });
};

export function EmpleadoCursos({ employeeId }: EmpleadoCursosProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["employee-courses", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, employees(first_name, last_name, document_number)")
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-courses", employeeId] });
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

  const handleNew = () => { setSelected(null); setShowForm(true); };
  const handleEdit = (c: any) => { setSelected(c); setShowForm(true); };
  const handleViewDetails = (c: any) => { setSelected(c); setShowDetail(true); };
  const handleDelete = (c: any) => { setSelected(c); setShowDeleteDialog(true); };

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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Cursos y Capacitaciones
            </CardTitle>
            <Button size="sm" className="gradient-primary" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Curso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!courses || courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2" />
              <p>No hay cursos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Obtención</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.course_name}</TableCell>
                    <TableCell>{course.provider || "-"}</TableCell>
                    <TableCell>{formatDate(course.start_date)}</TableCell>
                    <TableCell>{formatDate(course.expiry_date)}</TableCell>
                    <TableCell>{course.grade ? `${course.grade}%` : "-"}</TableCell>
                    <TableCell>{statusBadge[course.status || "pendiente"]}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(course)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(course)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(course)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
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

      <CursoForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelected(null);
        }}
        curso={selected}
        defaultEmployeeId={employeeId}
      />

      <CursoDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        curso={selected}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
    </>
  );
}
