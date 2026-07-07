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
import { ShieldCheck, Loader2, FileX, Plus, MoreHorizontal, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { VigilanciaForm } from "@/components/vigilancias/VigilanciaForm";
import { VigilanciaDetailDialog } from "@/components/vigilancias/VigilanciaDetailDialog";

interface EmpleadoVigilanciasProps {
  employeeId: string;
}

const statusBadge: Record<string, React.ReactNode> = {
  activa: <Badge className="bg-success/10 text-success border-success/20">Activa</Badge>,
  inactiva: <Badge className="bg-muted text-muted-foreground">Inactiva</Badge>,
  vencida: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencida</Badge>,
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  return format(parsed, "d MMM yyyy", { locale: es });
};

export function EmpleadoVigilancias({ employeeId }: EmpleadoVigilanciasProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: vigilancias, isLoading } = useQuery({
    queryKey: ["employee-vigilancias", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vigilancias")
        .select("*, employees(first_name, last_name, document_number)")
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vigilancias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-vigilancias", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["vigilancias"] });
      toast.success("Vigilancia eliminada correctamente");
      setShowDeleteDialog(false);
      setSelected(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vigilancias")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-vigilancias", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["vigilancias"] });
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const handleNew = () => { setSelected(null); setShowForm(true); };
  const handleEdit = (vig: any) => { setSelected(vig); setShowForm(true); };
  const handleViewDetails = (vig: any) => { setSelected(vig); setShowDetail(true); };
  const handleDelete = (vig: any) => { setSelected(vig); setShowDeleteDialog(true); };

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
              <ShieldCheck className="h-5 w-5 text-primary" />
              Programas de Vigilancia Epidemiológica
            </CardTitle>
            <Button size="sm" className="gradient-primary" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Vigilancia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!vigilancias || vigilancias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2" />
              <p>No hay vigilancias registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Vigilancia</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Próximo Seguimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vigilancias.map((vig) => (
                  <TableRow key={vig.id}>
                    <TableCell className="font-medium">{vig.vigilancia_type}</TableCell>
                    <TableCell>{vig.diagnosis || "-"}</TableCell>
                    <TableCell>{formatDate(vig.start_date)}</TableCell>
                    <TableCell>{formatDate(vig.follow_up_date)}</TableCell>
                    <TableCell>{statusBadge[vig.status || "activa"]}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(vig)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(vig)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {vig.status === "activa" && (
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: vig.id, status: "inactiva" })}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Marcar inactiva
                            </DropdownMenuItem>
                          )}
                          {vig.status !== "activa" && (
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: vig.id, status: "activa" })}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(vig)}
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

      <VigilanciaForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelected(null);
        }}
        vigilancia={selected}
        defaultEmployeeId={employeeId}
      />

      <VigilanciaDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        vigilancia={selected}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vigilancia?</AlertDialogTitle>
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
