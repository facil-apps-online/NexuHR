import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
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
import { Plus, Shirt, Package, CheckCircle, Clock, Loader2, FileX, Edit, Trash2, AlertTriangle, Eye, BarChart3, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { toast } from "sonner";
import { DotacionForm } from "@/components/dotacion/DotacionForm";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dotacion() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tables<"dotacion"> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewSignatureUrl, setViewSignatureUrl] = useState<string | null>(null);

  const { data: dotacion, isLoading } = useQuery({
    queryKey: ["dotacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dotacion")
        .select("*, employees(first_name, last_name)")
        .order("delivery_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dotacion").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dotacion"] });
      toast.success("Registro eliminado correctamente");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(safeNewDate(date), "d MMM yyyy", { locale: es });
  };

  const yearStart = startOfYear(new Date()).toISOString();
  const totalThisYear = dotacion?.filter((d) => d.delivery_date >= yearStart.split("T")[0]).length || 0;
  const signed = dotacion?.filter((d) => !!d.signature_url).length || 0;
  const pendingSignature = dotacion?.filter((d) => !d.signature_url).length || 0;
  const expired = dotacion?.filter((d) => d.expiry_date && isPast(safeNewDate(d.expiry_date))).length || 0;

  const handleEdit = (item: Tables<"dotacion">) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const columns: ResponsiveColumn<Tables<"dotacion">>[] = [
    {
      key: "employee",
      label: "Empleado",
      primary: true,
      subtitle: true,
      render: (item) => {
        const emp = item.employees as any;
        return emp ? `${emp.first_name} ${emp.last_name}` : "-";
      },
    },
    {
      key: "item",
      label: "Elemento",
      render: (item) => item.item_name,
    },
    {
      key: "type",
      label: "Tipo",
      render: (item) => item.item_type || "-",
    },
    {
      key: "size",
      label: "Talla",
      render: (item) => item.size || "-",
    },
    {
      key: "quantity",
      label: "Cantidad",
      hideOnMobile: true,
      render: (item) => item.quantity,
    },
    {
      key: "deliveryDate",
      label: "Fecha Entrega",
      hideOnMobile: true,
      render: (item) => formatDate(item.delivery_date),
    },
    {
      key: "expiry",
      label: "Vencimiento",
      hideOnMobile: true,
      render: (item) => {
        const isExpired = item.expiry_date && isPast(safeNewDate(item.expiry_date));
        return item.expiry_date ? (
          <Badge className={isExpired
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : "bg-success/10 text-success border-success/20"
          }>
            {formatDate(item.expiry_date)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "signature",
      label: "Firma",
      hideOnMobile: true,
      render: (item) =>
        item.signature_url ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0"
            onClick={() => {
              const { data } = supabase.storage
                .from("signatures")
                .getPublicUrl(item.signature_url!);
              setViewSignatureUrl(data.publicUrl);
            }}
          >
            <Badge className="bg-success/10 text-success border-success/20 cursor-pointer">
              <Eye className="mr-1 h-3 w-3" />
              Ver Firma
            </Badge>
          </Button>
        ) : (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        ),
    },
  ];

  // Report analytics
  const dotacionReport = useMemo(() => {
    const all = dotacion || [];
    const byType: Record<string, number> = {};
    const byEmployee: Record<string, { name: string; count: number }> = {};
    const byMonth: Record<string, number> = {};
    let totalQty = 0;

    for (const d of all) {
      if (d.item_type) byType[d.item_type] = (byType[d.item_type] || 0) + 1;
      if (d.quantity) totalQty += d.quantity;
      if (d.delivery_date) {
        const month = d.delivery_date.substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + 1;
      }
      const empName = (d.employees as any) ? `${(d.employees as any).first_name} ${(d.employees as any).last_name}` : null;
      if (empName) {
        if (!byEmployee[empName]) byEmployee[empName] = { name: empName, count: 0 };
        byEmployee[empName].count++;
      }
    }

    const topTypes = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 8);
    const topEmployees = Object.values(byEmployee).sort((a, b) => b.count - a.count).slice(0, 10);
    const monthsSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6);

    return { topTypes, topEmployees, monthsSorted, totalQty };
  }, [dotacion]);

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Entrega de Dotación</h1>
            <p className="mt-1 text-muted-foreground">
              Control de entregas de uniformes y elementos de protección
            </p>
          </div>
          <Button className="gradient-accent" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Entrega
          </Button>
        </div>

        <Tabs defaultValue="gestion" className="space-y-6">
          <TabsList>
            <TabsTrigger value="gestion">Gestión</TabsTrigger>
            <TabsTrigger value="reportes">
              <BarChart3 className="h-4 w-4 mr-1" />
              Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gestion" className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <Shirt className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalThisYear}</p>
                  <p className="text-sm text-muted-foreground">Entregas este año</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="rounded-lg bg-success/10 p-3 text-success">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{signed}</p>
                  <p className="text-sm text-muted-foreground">Firmadas</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="rounded-lg bg-warning/10 p-3 text-warning">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingSignature}</p>
                  <p className="text-sm text-muted-foreground">Pendientes de firma</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{expired}</p>
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !dotacion || dotacion.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" />
                    <p>No hay entregas registradas</p>
                  </div>
                ) : (
                  <ResponsiveTable
                    columns={columns}
                    data={dotacion}
                    getKey={(item) => item.id}
                    emptyMessage="No hay entregas registradas"
                    actions={(item) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          disabled={!!item.signature_url}
                          title={item.signature_url ? "No se puede editar un registro firmado" : "Editar"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                          disabled={!!item.signature_url}
                          title={item.signature_url ? "No se puede eliminar un registro firmado" : "Eliminar"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Entregas por tipo de ítem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dotacionReport.topTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {dotacionReport.topTypes.map(([type, count], idx) => {
                        const max = dotacionReport.topTypes[0]?.[1] || 1;
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
                    <Users className="h-5 w-5 text-primary" />
                    Top empleados con más entregas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dotacionReport.topEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  ) : (
                    <div className="space-y-3">
                      {dotacionReport.topEmployees.map((emp, idx) => {
                        const max = dotacionReport.topEmployees[0]?.count || 1;
                        const pct = (emp.count / max) * 100;
                        return (
                          <div key={emp.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium truncate">{emp.name}</span>
                              </div>
                              <span className="text-muted-foreground">{emp.count} entrega{emp.count > 1 ? 's' : ''}</span>
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
                <div className="grid gap-4 sm:grid-cols-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{(dotacion || []).length}</p>
                    <p className="text-sm text-muted-foreground">Total entregas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dotacionReport.totalQty}</p>
                    <p className="text-sm text-muted-foreground">Unidades entregadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{signed}</p>
                    <p className="text-sm text-muted-foreground">Con firma</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingSignature}</p>
                    <p className="text-sm text-muted-foreground">Sin firma</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DotacionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        dotacion={editingItem}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este registro de dotación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Signature preview dialog */}
      <Dialog open={!!viewSignatureUrl} onOpenChange={() => setViewSignatureUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firma Digital</DialogTitle>
          </DialogHeader>
          {viewSignatureUrl && (
            <div className="flex justify-center p-4">
              <img
                src={viewSignatureUrl}
                alt="Firma digital"
                className="max-w-full max-h-64 rounded-lg border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
