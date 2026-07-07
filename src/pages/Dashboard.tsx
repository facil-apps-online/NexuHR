import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertList } from "@/components/dashboard/AlertList";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { ComplianceBars } from "@/components/dashboard/ComplianceBars";
import { FabToolbox } from "@/components/dashboard/FabToolbox";
import { PeriodSelector, type PeriodKey } from "@/components/dashboard/PeriodSelector";
import {
  Users,
  Stethoscope,
  ShieldCheck,
  FileSignature,
  GraduationCap,
  ClipboardCheck,
  Mail,
  HeartPulse,
} from "lucide-react";
import { useDashboardStats, type DashboardStatsBlock } from "@/hooks/useDashboardStats";

function num(block: DashboardStatsBlock | undefined, key: string, fallback = 0): number {
  const value = block?.[key];
  return typeof value === "number" ? value : fallback;
}

const periodLabels: Record<PeriodKey, string> = {
  current: "Este mes",
  prev: "Mes anterior",
  quarter: "Último trimestre",
};

export default function Dashboard() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("current");
  const [referenceDate, setReferenceDate] = useState<Date | undefined>(undefined);
  const { data: dashboardStats } = useDashboardStats({ referenceDate });

  const periodLabel = periodLabels[periodKey];

  const handlePeriodChange = (key: PeriodKey, date: Date | undefined) => {
    setPeriodKey(key);
    setReferenceDate(date);
  };

  const employees = dashboardStats?.employees;
  const trend = num(employees, "trend_pct");
  const employeeStats = employees
    ? {
        totalActive: num(employees, "total_active"),
        newThisMonth: num(employees, "new_this_month"),
        trend,
        trendIsPositive: trend >= 0,
      }
    : undefined;

  const exams = dashboardStats?.exams;
  const examStats = exams
    ? {
        total: num(exams, "total"),
        upToDate: num(exams, "vigente"),
        expired: num(exams, "vencido"),
        expiringSoon: num(exams, "proximo_vencer"),
        percentage: num(exams, "pct_vigente"),
      }
    : undefined;

  const courses = dashboardStats?.courses;
  const courseStats = courses
    ? {
        total: num(courses, "total"),
        completed: num(courses, "completado"),
        expired: num(courses, "vencido"),
        percentage: num(courses, "pct_completado"),
      }
    : undefined;

  const vigilancias = dashboardStats?.vigilancias;
  const vigilanciaStats = vigilancias
    ? {
        total: num(vigilancias, "total"),
        active: num(vigilancias, "activa"),
        expired: num(vigilancias, "vencida"),
      }
    : undefined;

  const evaluations = dashboardStats?.evaluations;
  const evalStats = evaluations
    ? {
        total: num(evaluations, "total"),
        pending: num(evaluations, "pending"),
      }
    : undefined;

  const communications = dashboardStats?.communications;
  const commStats = communications
    ? {
        total: num(communications, "total"),
        sentThisMonth: num(communications, "sent_this_month"),
      }
    : undefined;

  const notifications = dashboardStats?.notifications;
  const notificationStats = notifications
    ? {
        unread: num(notifications, "unread"),
        urgent: num(notifications, "urgent"),
      }
    : undefined;

  const incapacidadesAlert = (dashboardStats?.alerts ?? []).find((a) => a.id === "alert-7");
  const incapacidadesCount = incapacidadesAlert?.count ?? 0;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Panel Principal</h1>
            <p className="mt-1 text-muted-foreground">
              {periodLabel} &middot; Resumen del dashboard
            </p>
          </div>
          <PeriodSelector value={periodKey} onChange={handlePeriodChange} />
        </div>

        {/* Stats grid - Row 1 */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Empleados Activos"
            value={employeeStats?.totalActive ?? "-"}
            subtitle={`${employeeStats?.newThisMonth ?? 0} nuevos este mes`}
            icon={Users}
            href="/empleados"
            trend={employeeStats ? { value: Math.abs(employeeStats.trend), isPositive: employeeStats.trendIsPositive } : undefined}
          />
          <StatCard
            title="Exámenes al Día"
            value={examStats ? `${examStats.percentage}%` : "-"}
            subtitle={
              examStats
                ? (examStats.expired > 0
                  ? `${examStats.expired} vencidos`
                  : examStats.expiringSoon > 0
                    ? `${examStats.expiringSoon} por vencer`
                    : `${examStats.upToDate} de ${examStats.total} al día`)
                : "Cargando..."
            }
            icon={Stethoscope}
            href="/examenes"
            variant={
              examStats
                ? (examStats.expired > 0
                  ? "danger"
                  : examStats.expiringSoon > 0
                    ? "warning"
                    : "success")
                : "default"
            }
          />
          <StatCard
            title="Cursos Completados"
            value={courseStats ? `${courseStats.percentage}%` : "-"}
            subtitle={courseStats ? `${courseStats.expired} vencidos` : "Cargando..."}
            icon={GraduationCap}
            href="/cursos"
            variant={courseStats && courseStats.percentage >= 80 ? "success" : "warning"}
          />
          <StatCard
            title="Alertas Pendientes"
            value={notificationStats?.unread ?? "-"}
            subtitle={`${notificationStats?.urgent ?? 0} urgentes`}
            icon={ShieldCheck}
            variant={notificationStats && notificationStats.urgent > 0 ? "warning" : "default"}
          />
        </div>

        {/* Stats grid - Row 2 */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Vigilancias Activas"
            value={vigilanciaStats?.active ?? "-"}
            subtitle={`${vigilanciaStats?.expired ?? 0} vencidas`}
            icon={FileSignature}
            href="/vigilancias"
            variant={vigilanciaStats && vigilanciaStats.expired > 0 ? "danger" : "default"}
          />
          <StatCard
            title="Evaluaciones"
            value={evalStats?.pending ?? "-"}
            subtitle={`${evalStats?.total ?? 0} en total`}
            icon={ClipboardCheck}
            href="/evaluaciones-desempeno"
            variant={evalStats && evalStats.pending > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Comunicaciones"
            value={commStats?.sentThisMonth ?? "-"}
            subtitle="Enviadas este mes"
            icon={Mail}
            href="/comunicaciones"
          />
          <StatCard
            title="Incapacidades en Revisión"
            value={incapacidadesCount}
            subtitle="Pendientes por revisar"
            icon={HeartPulse}
            href="/incapacidades"
            variant={incapacidadesCount > 0 ? "warning" : "default"}
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertList referenceDate={referenceDate} />
          </div>
          <div>
            <ComplianceBars referenceDate={referenceDate} />
          </div>
        </div>

        {/* Second row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <UpcomingDeadlines referenceDate={referenceDate} />
          </div>
        </div>
      </div>

      <FabToolbox />
    </MainLayout>
  );
}
