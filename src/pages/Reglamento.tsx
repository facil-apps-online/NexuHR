import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import {
  Plus, BookOpen, FileCheck, Users, Loader2, FileX, Eye,
  History, PenTool, CheckCircle2, Clock,
} from "lucide-react";
import { RegulationForm } from "@/components/reglamento/RegulationForm";
import { RegulationViewer } from "@/components/reglamento/RegulationViewer";

const statusColor: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  publicado: "bg-success/10 text-success border-success/20",
  archivado: "bg-warning/10 text-warning border-warning/20",
};

export default function Reglamento() {
  const [activeTab, setActiveTab] = useState("reglamentos");
  const [showForm, setShowForm] = useState(false);
  const [viewingRegulationId, setViewingRegulationId] = useState<string | null>(null);

  const { data: regulations, isLoading } = useQuery({
    queryKey: ["regulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: acknowledgments } = useQuery({
    queryKey: ["regulation-acknowledgments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulation_acknowledgments")
        .select("*, employees!regulation_acknowledgments_employee_id_fkey(first_name, last_name, position, department), regulations!regulation_acknowledgments_regulation_id_fkey(title, version)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id").eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const activeRegulations = regulations?.filter((r: any) => r.status === "publicado") || [];
  const totalEmployees = employees?.length || 0;

  const getAcknowledgmentStats = (regulationId: string) => {
    const acks = acknowledgments?.filter((a: any) => a.regulation_id === regulationId && a.status === "firmado") || [];
    return { signed: acks.length, total: totalEmployees, pct: totalEmployees > 0 ? Math.round((acks.length / totalEmployees) * 100) : 0 };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reglamento Interno</h1>
            <p className="text-muted-foreground">
              Control de versiones y socialización del reglamento de trabajo
            </p>
          </div>
          {activeTab === "reglamentos" && (
            <Button className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Nueva Versión
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reglamentos" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Versiones
            </TabsTrigger>
            <TabsTrigger value="seguimiento" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Seguimiento
            </TabsTrigger>
          </TabsList>

          {/* VERSIONS TAB */}
          <TabsContent value="reglamentos" className="space-y-6 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3"><BookOpen className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-2xl font-bold">{regulations?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Versiones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-success/10 p-3"><CheckCircle2 className="h-6 w-6 text-success" /></div>
                    <div>
                      <p className="text-2xl font-bold">{activeRegulations.length}</p>
                      <p className="text-sm text-muted-foreground">Publicados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-warning/10 p-3"><Users className="h-6 w-6 text-warning" /></div>
                    <div>
                      <p className="text-2xl font-bold">{totalEmployees}</p>
                      <p className="text-sm text-muted-foreground">Empleados Activos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Versiones del Reglamento</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : !regulations?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay versiones del reglamento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {regulations.map((reg: any) => {
                      const stats = getAcknowledgmentStats(reg.id);
                      return (
                        <Card key={reg.id} className="border">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">{reg.title}</h3>
                                  <Badge variant="outline" className="text-xs">v{reg.version}</Badge>
                                  <Badge variant="outline" className={statusColor[reg.status] || ""}>
                                    {reg.status === "publicado" ? "Publicado" : reg.status === "borrador" ? "Borrador" : "Archivado"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <History className="h-3 w-3" />
                                    Vigente desde: {format(safeNewDate(reg.effective_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                  <span>{reg.content_type === "pdf" ? "📄 PDF" : "📝 Texto"}</span>
                                  {reg.requires_signature && (
                                    <span className="flex items-center gap-1"><PenTool className="h-3 w-3" /> Firma requerida</span>
                                  )}
                                </div>
                                {reg.status === "publicado" && (
                                  <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>Socialización</span>
                                      <span className="font-medium">{stats.signed}/{stats.total} ({stats.pct}%)</span>
                                    </div>
                                    <Progress value={stats.pct} className="h-2" />
                                  </div>
                                )}
                              </div>
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => setViewingRegulationId(reg.id)}>
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRACKING TAB */}
          <TabsContent value="seguimiento" className="space-y-6 mt-4">
            <Card>
              <CardHeader><CardTitle>Registro de Lecturas y Firmas</CardTitle></CardHeader>
              <CardContent>
                {!acknowledgments?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay registros de socialización</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Reglamento</TableHead>
                        <TableHead>Versión</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acknowledgments.map((ack: any) => (
                        <TableRow key={ack.id}>
                          <TableCell className="font-medium">
                            {ack.employees?.first_name} {ack.employees?.last_name}
                          </TableCell>
                          <TableCell>{ack.employees?.position || "—"}</TableCell>
                          <TableCell>{ack.regulations?.title}</TableCell>
                          <TableCell>v{ack.regulations?.version}</TableCell>
                          <TableCell>
                            {ack.acknowledged_at ? format(new Date(ack.acknowledged_at), "d MMM yyyy HH:mm", { locale: es }) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              ack.status === "firmado" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"
                            }>
                              {ack.status === "firmado" ? (
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Firmado</span>
                              ) : (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</span>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RegulationForm open={showForm} onOpenChange={setShowForm} />
      <RegulationViewer
        open={!!viewingRegulationId}
        onOpenChange={(v) => { if (!v) setViewingRegulationId(null); }}
        regulationId={viewingRegulationId}
      />
    </MainLayout>
  );
}
