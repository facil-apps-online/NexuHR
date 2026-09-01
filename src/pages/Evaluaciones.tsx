import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { Plus, Search, ClipboardCheck, TrendingUp, Users, Loader2, Star, FileX, LayoutTemplate, BarChart3, Award, AlertTriangle } from "lucide-react";
import { EvaluacionForm } from "@/components/evaluaciones/EvaluacionForm";
import { EvaluacionExecForm } from "@/components/evaluaciones/EvaluacionExecForm";
import { EvaluacionReport } from "@/components/evaluaciones/EvaluacionReport";
import { PlantillaForm } from "@/components/evaluaciones/PlantillaForm";
import { PlantillasList } from "@/components/evaluaciones/PlantillasList";

const estadoColor: Record<string, string> = {
  completada: "bg-success/10 text-success border-success/20",
  en_proceso: "bg-warning/10 text-warning border-warning/20",
  pendiente: "bg-muted text-muted-foreground",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Evaluaciones() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showPlantillaForm, setShowPlantillaForm] = useState(false);
  const [showExecForm, setShowExecForm] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [showReportId, setShowReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("evaluaciones");

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*, evaluation_templates(name, evaluation_type, scale_max), employees!evaluations_employee_id_fkey(first_name, last_name, position)")
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = evaluations?.filter((e: any) => {
    const matchesSearch = !searchTerm ||
      `${e.employees?.first_name} ${e.employees?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.evaluation_templates?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: evaluations?.length || 0,
    completadas: evaluations?.filter((e: any) => e.status === "completada").length || 0,
    enProceso: evaluations?.filter((e: any) => e.status === "en_proceso").length || 0,
    pendientes: evaluations?.filter((e: any) => e.status === "pendiente").length || 0,
  };

  const columns: ResponsiveColumn<any>[] = [
    {
      key: "employee",
      label: "Empleado",
      primary: true,
      render: (item) => <span className="font-medium">{item.employees?.first_name} {item.employees?.last_name}</span>,
    },
    {
      key: "position",
      label: "Cargo",
      subtitle: true,
      render: (item) => item.employees?.position || "-",
    },
    {
      key: "template",
      label: "Plantilla",
      render: (item) => item.evaluation_templates?.name || "-",
    },
    {
      key: "period",
      label: "Periodo",
      render: (item) => item.period,
    },
    {
      key: "date",
      label: "Fecha",
      render: (item) => format(safeNewDate(item.evaluation_date), "d MMM yyyy", { locale: es }),
    },
    {
      key: "score",
      label: "Puntaje",
      render: (item) => item.overall_score ? (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="font-medium">{item.overall_score}</span>
          <span className="text-muted-foreground">/{item.evaluation_templates?.scale_max || 5}</span>
        </div>
      ) : <span className="text-muted-foreground">-</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <Badge variant="outline" className={estadoColor[item.status || "pendiente"]}>
          {item.status === "en_proceso" ? "En proceso" :
            item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || "Pendiente"}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Evaluaciones</h1>
            <p className="text-muted-foreground">
              Gestión unificada de evaluaciones de desempeño, competencias y clima
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === "plantillas" ? (
              <Button className="gap-2" onClick={() => setShowPlantillaForm(true)}>
                <Plus className="h-4 w-4" />
                Nueva Plantilla
              </Button>
            ) : (
              <Button className="gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Nueva Evaluación
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="evaluaciones" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="plantillas" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="reportes" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluaciones" className="space-y-6 mt-4">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-success/10 p-3">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.completadas}</p>
                      <p className="text-sm text-muted-foreground">Completadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-warning/10 p-3">
                      <Users className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.enProceso}</p>
                      <p className="text-sm text-muted-foreground">En Proceso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <Star className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pendientes}</p>
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empleado o plantilla..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Listado de Evaluaciones</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !filtered || filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" />
                    <p>No hay evaluaciones registradas</p>
                  </div>
                ) : (
                  <ResponsiveTable
                    columns={columns}
                    data={filtered}
                    getKey={(item: any) => item.id}
                    emptyMessage="No hay evaluaciones registradas"
                    actions={(item: any) => (
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (item.status === "completada") {
                          setShowReportId(item.id);
                        } else {
                          setSelectedEvalId(item.id);
                          setShowExecForm(true);
                        }
                      }}>
                        {item.status === "completada" ? "Ver Informe" : "Evaluar"}
                      </Button>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6 mt-4">
            {(() => {
              const completed = (evaluations || []).filter((e: any) => e.status === 'completada' && e.overall_score != null);
              const byTemplate: Record<string, { name: string; scores: number[] }> = {};
              for (const e of completed) {
                const tName = e.evaluation_templates?.name || 'Sin plantilla';
                if (!byTemplate[tName]) byTemplate[tName] = { name: tName, scores: [] };
                byTemplate[tName].scores.push(e.overall_score);
              }
              const templateStats = Object.values(byTemplate).map(t => ({
                name: t.name,
                avg: t.scores.reduce((a, b) => a + b, 0) / t.scores.length,
                count: t.scores.length,
              })).sort((a, b) => b.avg - a.avg);

              const allScores = completed.map((e: any) => e.overall_score);
              const globalAvg = allScores.length > 0 ? (allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length).toFixed(1) : '0';
              const topEmployees = completed
                .sort((a: any, b: any) => b.overall_score - a.overall_score)
                .slice(0, 10);
              const bottomEmployees = completed
                .sort((a: any, b: any) => a.overall_score - b.overall_score)
                .slice(0, 10);

              return (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Promedio por plantilla
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {templateStats.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin evaluaciones completadas</p>
                        ) : (
                          <div className="space-y-3">
                            {templateStats.map((t, idx) => {
                              const maxScore = evaluations?.[0]?.evaluation_templates?.scale_max || 5;
                              const pct = (t.avg / maxScore) * 100;
                              return (
                                <div key={t.name} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                      <span className="truncate">{t.name}</span>
                                    </div>
                                    <span className="text-muted-foreground shrink-0 ml-2">{t.avg.toFixed(1)} ({t.count})</span>
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
                          <Award className="h-5 w-5 text-success" />
                          Top 10 mejores puntajes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topEmployees.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                        ) : (
                          <div className="space-y-2">
                            {topEmployees.map((e: any, idx) => (
                              <div key={e.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                  <span className="truncate">{e.employees?.first_name} {e.employees?.last_name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  <span className="font-bold">{e.overall_score}</span>
                                </div>
                              </div>
                            ))}
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
                          <p className="text-2xl font-bold">{stats.total}</p>
                          <p className="text-sm text-muted-foreground">Total evaluaciones</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.completadas}</p>
                          <p className="text-sm text-muted-foreground">Completadas</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{globalAvg}</p>
                          <p className="text-sm text-muted-foreground">Promedio global</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{templateStats.length}</p>
                          <p className="text-sm text-muted-foreground">Plantillas usadas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="plantillas" className="mt-4">
            <PlantillasList onCreateNew={() => setShowPlantillaForm(true)} />
          </TabsContent>
        </Tabs>
      </div>

      <EvaluacionForm open={showForm} onOpenChange={setShowForm} />
      <PlantillaForm open={showPlantillaForm} onOpenChange={setShowPlantillaForm} />
      <EvaluacionExecForm open={showExecForm} onOpenChange={setShowExecForm} evaluationId={selectedEvalId} />
      <EvaluacionReport open={!!showReportId} onOpenChange={(v) => { if (!v) setShowReportId(null); }} evaluationId={showReportId} />
    </MainLayout>
  );
}
