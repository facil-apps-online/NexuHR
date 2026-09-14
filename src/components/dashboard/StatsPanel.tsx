import {
  Users,
  Stethoscope,
  FileSignature,
  GraduationCap,
  ClipboardCheck,
  Mail,
  HeartPulse,
  HardHat,
  Package,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import type { DashboardStats, DashboardStatsBlock } from "@/hooks/useDashboardStats";
import { cn } from "@/lib/utils";

function num(block: DashboardStatsBlock | undefined, key: string, fallback = 0): number {
  const value = block?.[key];
  return typeof value === "number" ? value : fallback;
}

function complianceModulePct(stats: DashboardStats | undefined, moduleCode: string): number {
  const mod = stats?.compliance?.modules?.find((m) => m.module === moduleCode);
  return mod?.percentage ?? 0;
}

function overallTextColor(pct: number) {
  if (pct >= 80) return "text-success";
  if (pct >= 50) return "text-warning";
  return "text-destructive";
}

function overallBarColor(pct: number) {
  if (pct >= 80) return "bg-success";
  if (pct >= 50) return "bg-warning";
  return "bg-destructive";
}

export function StatsPanel({ stats }: { stats?: DashboardStats }) {
  const loaded = !!stats;
  const employees = stats?.employees;
  const exams = stats?.exams;
  const courses = stats?.courses;
  const vigilancias = stats?.vigilancias;
  const evaluations = stats?.evaluations;
  const communications = stats?.communications;
  const incapacidades = stats?.incapacidades;
  const activos = stats?.activos_fijos;
  const dotacion = stats?.dotacion;

  const totalActive = num(employees, "total_active");
  const newThisMonth = num(employees, "new_this_month");
  const terminatedPeriod = num(employees, "terminated_period");
  const trend = num(employees, "trend_pct");
  const trendIsPositive = trend >= 0;
  const turnoverPct = num(employees, "turnover_pct");

  const examPct = num(exams, "pct_vigente");
  const examExpired = num(exams, "vencido");
  const examExpiringSoon = num(exams, "proximo_vencer");
  const examUpToDate = num(exams, "vigente");
  const examTotal = num(exams, "total");

  const coursePct = num(courses, "pct_completado");
  const courseExpired = num(courses, "vencido");

  const vigActive = num(vigilancias, "activa");
  const vigExpired = num(vigilancias, "vencida");
  const vigTotal = num(vigilancias, "total");
  const vigPct = num(vigilancias, "pct_activa");

  const evalPending = num(evaluations, "pending");
  const evalTotal = num(evaluations, "total");

  const commSent = num(communications, "sent_this_month");
  const commRevisadas = num(communications, "revisadas");
  const commPct = num(communications, "pct_revisadas");

  const incToday = num(incapacidades, "incapacitados_hoy");
  const incReview = num(incapacidades, "en_revision");
  const incPlantilla = num(incapacidades, "empleados_activos");
  const incPct = num(incapacidades, "pct_incapacitados");

  const actAsignados = num(activos, "asignados");
  const actTotal = num(activos, "total");
  const actPct = num(activos, "pct_asignados");

  const dotPct = num(dotacion, "pct_periodo");
  const dotDone = num(dotacion, "completadas_periodo");
  const dotScheduled = num(dotacion, "scheduled_periodo");

  const evalCompliancePct = complianceModulePct(stats, "evaluaciones");
  const overallPct = stats?.compliance?.overall?.percentage ?? 0;

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Panel de Cumplimiento</h3>
          <p className="text-sm text-muted-foreground">Indicadores por módulo del período</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Cumplimiento general</span>
          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", overallBarColor(overallPct))}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
          <span className={cn("text-lg font-bold tabular-nums", overallTextColor(overallPct))}>
            {overallPct}%
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Empleados Activos"
          value={loaded ? totalActive : "-"}
          subtitle={loaded ? `${newThisMonth} nuevos · ${terminatedPeriod} bajas` : "Cargando..."}
          icon={Users}
          href="/empleados"
          embedded
          trend={loaded ? { value: Math.abs(trend), isPositive: trendIsPositive } : undefined}
          progress={{ value: turnoverPct, invert: true, label: "Rotación" }}
        />
        <StatCard
          title="Exámenes al Día"
          value={loaded ? `${examPct}%` : "-"}
          subtitle={
            loaded
              ? examExpired > 0
                ? `${examExpired} vencidos`
                : examExpiringSoon > 0
                  ? `${examExpiringSoon} por vencer`
                  : `${examUpToDate} de ${examTotal} al día`
              : "Cargando..."
          }
          icon={Stethoscope}
          href="/examenes"
          embedded
          variant={examExpired > 0 ? "danger" : examExpiringSoon > 0 ? "warning" : "success"}
          progress={{ value: examPct }}
        />
        <StatCard
          title="Cursos Completados"
          value={loaded ? `${coursePct}%` : "-"}
          subtitle={loaded ? `${courseExpired} vencidos` : "Cargando..."}
          icon={GraduationCap}
          href="/cursos"
          embedded
          variant={coursePct >= 80 ? "success" : "warning"}
          progress={{ value: coursePct }}
        />
        <StatCard
          title="Vigilancias Activas"
          value={loaded ? vigActive : "-"}
          subtitle={loaded ? `${vigExpired} vencidas de ${vigTotal}` : "Cargando..."}
          icon={FileSignature}
          href="/vigilancias"
          embedded
          variant={vigExpired > 0 ? "danger" : "default"}
          progress={{ value: vigPct }}
        />
        <StatCard
          title="Evaluaciones"
          value={loaded ? evalPending : "-"}
          subtitle={loaded ? `${evalTotal} en total` : "Cargando..."}
          icon={ClipboardCheck}
          href="/evaluaciones"
          embedded
          variant={evalPending > 0 ? "warning" : "default"}
          progress={{ value: evalCompliancePct }}
        />
        <StatCard
          title="Dotación"
          value={loaded ? `${dotPct}%` : "-"}
          subtitle={loaded ? `${dotDone} de ${dotScheduled} entregas del período` : "Cargando..."}
          icon={HardHat}
          href="/dotacion"
          embedded
          progress={{ value: dotPct }}
        />
        <StatCard
          title="Comunicaciones"
          value={loaded ? commSent : "-"}
          subtitle={loaded ? `${commRevisadas} revisadas en el portal` : "Cargando..."}
          icon={Mail}
          href="/comunicaciones"
          embedded
          progress={{ value: commPct }}
        />
        <StatCard
          title="Empleados Incapacitados"
          value={loaded ? incToday : "-"}
          subtitle={loaded ? `${incReview} en revisión · plantilla ${incPlantilla}` : "Cargando..."}
          icon={HeartPulse}
          href="/incapacidades"
          embedded
          variant={incPct > 30 ? "danger" : incPct > 10 ? "warning" : "default"}
          progress={{ value: incPct, invert: true, label: "Vs plantilla" }}
        />
        <StatCard
          title="Activos Asignados"
          value={loaded ? actAsignados : "-"}
          subtitle={loaded ? `de ${actTotal} activos` : "Cargando..."}
          icon={Package}
          href="/activos-fijos"
          embedded
          progress={{ value: actPct }}
        />
      </div>
    </div>
  );
}
