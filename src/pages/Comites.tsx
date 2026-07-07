import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, Calendar, Award, AlertTriangle, Loader2, Edit, Trash2 } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { ComiteForm } from "@/components/comites/ComiteForm";
import { ComiteDetailDialog } from "@/components/comites/ComiteDetailDialog";
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

export default function Comites() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [detailCommittee, setDetailCommittee] = useState<{ id: string; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: committees, isLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select(`*, members:committee_members(id, role, active, employee:employees(first_name, last_name))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("committees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comité eliminado");
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      setDeleteId(null);
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const getStatus = (endDate: string | null) => {
    if (!endDate) return "active";
    return isPast(safeNewDate(endDate)) ? "expired" : "active";
  };

  const getDaysLeft = (endDate: string | null) => {
    if (!endDate) return null;
    const days = differenceInDays(safeNewDate(endDate), new Date());
    return days > 0 ? days : 0;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(safeNewDate(date), "d MMM yyyy", { locale: es });
  };

  const totalCommittees = committees?.length || 0;
  const activeCount = committees?.filter((c) => getStatus(c.end_date) === "active").length || 0;
  const expiredCount = totalCommittees - activeCount;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Comités</h1>
            <p className="mt-1 text-muted-foreground">
              Gestión de comités y brigadas de la organización
            </p>
          </div>
          <Button className="gradient-primary" onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Comité
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCommittees}</p>
              <p className="text-sm text-muted-foreground">Comités registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-success/20 bg-success/5 p-4 shadow-card">
            <div className="rounded-lg bg-success/10 p-3 text-success">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Vigentes</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-card">
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiredCount}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </div>
          </div>
        </div>

        {/* Committee cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !committees || committees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay comités registrados</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {committees.map((committee) => {
              const status = getStatus(committee.end_date);
              const daysLeft = getDaysLeft(committee.end_date);
              const activeMembers = committee.members?.filter((m: any) => m.active) || [];

              return (
                <Card key={committee.id} className="card-interactive">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{committee.name}</CardTitle>
                        {committee.description && (
                          <CardDescription className="mt-1">{committee.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {status === "active" ? (
                          <Badge className="bg-success/10 text-success border-success/20">Vigente</Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Dates */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(committee.start_date)} - {formatDate(committee.end_date)}
                      </span>
                      {daysLeft !== null && daysLeft > 0 && (
                        <Badge variant="outline" className="ml-auto">
                          {daysLeft} días
                        </Badge>
                      )}
                    </div>

                    {/* Members */}
                    <div>
                      <p className="mb-2 text-sm font-medium">Miembros ({activeMembers.length})</p>
                      {activeMembers.length > 0 ? (
                        <div className="flex -space-x-2">
                          {activeMembers.slice(0, 4).map((member: any, index: number) => (
                            <Avatar key={member.id || index} className="border-2 border-card">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {member.employee?.first_name?.[0] || "?"}
                                {member.employee?.last_name?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {activeMembers.length > 4 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                              +{activeMembers.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin miembros</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDetailCommittee({ id: committee.id, name: committee.name })}
                      >
                        Gestionar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditData(committee);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => setDeleteId(committee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ComiteForm
        open={showForm}
        onOpenChange={setShowForm}
        editData={editData}
      />

      {detailCommittee && (
        <ComiteDetailDialog
          open={!!detailCommittee}
          onOpenChange={(open) => !open && setDetailCommittee(null)}
          committeeId={detailCommittee.id}
          committeeName={detailCommittee.name}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comité?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el comité y sus miembros asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
