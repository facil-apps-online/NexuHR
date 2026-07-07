import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, Star, Printer, TrendingUp, TrendingDown, Target, User, Calendar, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

interface EvaluacionReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluationId: string | null;
}

function getScoreLevel(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return { label: "Excelente", color: "text-success", bg: "bg-success/10 border-success/20", icon: "🌟" };
  if (pct >= 60) return { label: "Bueno", color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: "👍" };
  if (pct >= 40) return { label: "Regular", color: "text-warning", bg: "bg-warning/10 border-warning/20", icon: "⚠️" };
  return { label: "Bajo", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: "📉" };
}

export function EvaluacionReport({ open, onOpenChange, evaluationId }: EvaluacionReportProps) {
  const { data: evaluation, isLoading } = useQuery({
    queryKey: ["evaluation-report", evaluationId],
    queryFn: async () => {
      if (!evaluationId) return null;

      const { data: eval_, error } = await supabase
        .from("evaluations")
        .select(`
          *,
          evaluation_templates(*, evaluation_template_sections(*, evaluation_template_criteria(*))),
          employees!evaluations_employee_id_fkey(first_name, last_name, position, department, document_number),
          evaluator:employees!evaluations_evaluator_id_fkey(first_name, last_name)
        `)
        .eq("id", evaluationId)
        .single();
      if (error) throw error;

      const { data: responses } = await supabase
        .from("evaluation_responses")
        .select("*")
        .eq("evaluation_id", evaluationId);

      return { ...eval_, responses: responses || [] };
    },
    enabled: open && !!evaluationId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (!evaluation || isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px]">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const template = evaluation.evaluation_templates;
  const employee = evaluation.employees;
  const evaluator = evaluation.evaluator;
  const scaleMin = template?.scale_min ?? 1;
  const scaleMax = template?.scale_max ?? 5;
  const overallScore = evaluation.overall_score ?? 0;
  const scoreLevel = getScoreLevel(overallScore, scaleMax);

  const sections = template?.evaluation_template_sections
    ?.slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order) || [];

  // Calculate per-section scores
  const sectionScores = sections.map((section: any) => {
    const criteria = section.evaluation_template_criteria || [];
    let totalScore = 0;
    let count = 0;

    criteria.forEach((criterion: any) => {
      const resp = (evaluation.responses as any[]).find((r: any) => r.criterion_id === criterion.id);
      if (resp) {
        if (criterion.response_type === "scale" && resp.score != null) {
          totalScore += ((resp.score - scaleMin) / (scaleMax - scaleMin)) * 100;
          count++;
        } else if (criterion.response_type === "yes_no") {
          if (criterion.correct_answer) {
            totalScore += resp.response_value === criterion.correct_answer ? 100 : 0;
          } else {
            totalScore += resp.response_value === "Sí" ? 100 : 0;
          }
          count++;
        } else if (criterion.response_type === "single_choice" && criterion.correct_answer) {
          totalScore += resp.response_value === criterion.correct_answer ? 100 : 0;
          count++;
        } else if (resp.score != null) {
          totalScore += ((resp.score - scaleMin) / (scaleMax - scaleMin)) * 100;
          count++;
        }
      }
    });

    const avg = count > 0 ? Math.round(totalScore / count) : 0;
    return {
      name: section.name.length > 18 ? section.name.substring(0, 18) + "…" : section.name,
      fullName: section.name,
      score: avg,
      weight: section.weight,
      criteriaCount: criteria.length,
    };
  });

  const radarData = sectionScores.map((s: any) => ({
    subject: s.name,
    score: s.score,
    fullMark: 100,
  }));

  const barColors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Informe de Evaluación</DialogTitle>
              <DialogDescription>
                {template?.name} — {template?.evaluation_type}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 print:hidden">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Executive Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Empleado</p>
                    <p className="font-medium">{employee?.first_name} {employee?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{employee?.position || "Sin cargo"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Departamento</p>
                    <p className="font-medium">{employee?.department || "—"}</p>
                    <p className="text-xs text-muted-foreground">Doc: {employee?.document_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Fecha / Período</p>
                    <p className="font-medium">
                      {format(safeNewDate(evaluation.evaluation_date), "d MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">{evaluation.period}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Evaluador</p>
                    <p className="font-medium">
                      {evaluator ? `${evaluator.first_name} ${evaluator.last_name}` : "—"}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {evaluation.status === "completada" ? "Completada" : evaluation.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Score */}
          <Card className={`border ${scoreLevel.bg}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{scoreLevel.icon}</div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntaje General</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${scoreLevel.color}`}>
                        {overallScore}
                      </span>
                      <span className="text-lg text-muted-foreground">/ {scaleMax}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-sm px-3 py-1 ${scoreLevel.bg} ${scoreLevel.color} border`}>
                    {scoreLevel.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((overallScore / scaleMax) * 100)}% del máximo
                  </p>
                </div>
              </div>
              <Progress
                value={(overallScore / scaleMax) * 100}
                className="h-3 mt-4"
              />
            </CardContent>
          </Card>

          {/* Charts */}
          {sectionScores.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Radar Chart */}
              {sectionScores.length >= 3 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Perfil por Secciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Radar
                          name="Puntaje"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Puntaje por Sección (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={sectionScores} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value: number) => [`${value}%`, "Puntaje"]}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {sectionScores.map((_: any, index: number) => (
                          <Cell key={index} fill={barColors[index % barColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section Detail Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalle por Sección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionScores.map((section: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{section.fullName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Peso: {section.weight}%</Badge>
                      <span className={`font-bold ${section.score >= 80 ? "text-success" : section.score >= 60 ? "text-primary" : section.score >= 40 ? "text-warning" : "text-destructive"}`}>
                        {section.score}%
                      </span>
                    </div>
                  </div>
                  <Progress value={section.score} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Detailed Responses */}
          {sections.map((section: any) => (
            <Card key={section.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{section.name}</CardTitle>
                  <Badge variant="outline">{section.weight}%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.evaluation_template_criteria
                    ?.slice()
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((criterion: any) => {
                      const resp = (evaluation.responses as any[]).find(
                        (r: any) => r.criterion_id === criterion.id
                      );
                      return (
                        <div key={criterion.id} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{criterion.name}</p>
                            {criterion.description && (
                              <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            )}
                            {resp?.comments && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {resp.comments}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {criterion.response_type === "scale" && resp?.score != null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-warning text-warning" />
                                <span className="font-bold">{resp.score}</span>
                                <span className="text-xs text-muted-foreground">/{scaleMax}</span>
                              </div>
                            ) : resp?.response_value ? (
                              <Badge variant="secondary" className="text-xs">
                                {resp.response_value.includes("||")
                                  ? resp.response_value.split("||").join(", ")
                                  : resp.response_value}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin respuesta</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}

          <Separator />

          {/* Qualitative Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            {evaluation.strengths && (
              <Card className="bg-success/5 border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Fortalezas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{evaluation.strengths}</p>
                </CardContent>
              </Card>
            )}
            {evaluation.areas_improvement && (
              <Card className="bg-warning/5 border-warning/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-warning" />
                    Áreas de Mejora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{evaluation.areas_improvement}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {evaluation.action_plan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Plan de Acción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{evaluation.action_plan}</p>
              </CardContent>
            </Card>
          )}

          {evaluation.comments && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Comentarios Generales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{evaluation.comments}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
