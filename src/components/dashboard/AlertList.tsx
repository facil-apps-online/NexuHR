import { useMemo, useState } from "react";
import { AlertTriangle, Calendar, FileWarning, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDashboardStats, type AlertItem } from "@/hooks/useDashboardStats";

const typeStyles = {
  urgent: {
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: AlertTriangle,
    iconColor: "text-destructive",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/20",
    icon: FileWarning,
    iconColor: "text-warning",
  },
  info: {
    bg: "bg-info/10",
    border: "border-info/20",
    icon: Calendar,
    iconColor: "text-info",
  },
};

const moduleLabels: Record<string, string> = {
  examenes: "Exámenes",
  cursos: "Cursos",
  evaluaciones: "Evaluaciones",
  eventos: "Eventos y Firmas",
  comites: "Comités",
  dotacion: "Dotación",
  incapacidades: "Incapacidades",
};

const moduleRoutes: Record<string, string> = {
  examenes: "/examenes",
  cursos: "/cursos",
  evaluaciones: "/evaluaciones",
  eventos: "/eventos",
  comites: "/comites",
  dotacion: "/dotacion",
  incapacidades: "/incapacidades",
};

export function AlertList({ referenceDate }: { referenceDate?: Date }) {
  const { data: stats } = useDashboardStats({ referenceDate });
  const [activeModule, setActiveModule] = useState<string>("all");
  const alerts = useMemo(() => stats?.alerts ?? [], [stats]);

  const moduleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    alerts.forEach((a) => {
      const key = a.module ?? "otros";
      counts.set(key, (counts.get(key) ?? 0) + a.count);
    });
    return counts;
  }, [alerts]);

  const filtered =
    activeModule === "all"
      ? alerts
      : alerts.filter((a) => (a.module ?? "otros") === activeModule);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Alertas Pendientes</h3>
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
          {stats?.alerts_total ?? 0} alertas
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveModule("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeModule === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-secondary"
          )}
        >
          Todos ({stats?.alerts_total ?? 0})
        </button>
        {[...moduleCounts.entries()].map(([mod, count]) => (
          <button
            key={mod}
            type="button"
            onClick={() => setActiveModule(mod)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeModule === mod
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {moduleLabels[mod] ?? mod} ({count})
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay alertas pendientes
          </p>
        ) : (
          filtered.slice(0, 8).map((alert) => {
            const style = typeStyles[alert.type];
            const Icon = style.icon;
            const route = moduleRoutes[alert.module ?? ""];
            const row = (
              <div
                className={cn(
                  "flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50 cursor-pointer",
                  style.bg,
                  style.border
                )}
              >
                <div className={cn("mt-0.5", style.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{alert.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {alert.count > 0 ? `${alert.count} pendiente${alert.count !== 1 ? "s" : ""}` : ""}
                </div>
                {route && <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />}
              </div>
            );
            return route ? (
              <Link key={alert.id} to={route} className="block">
                {row}
              </Link>
            ) : (
              <div key={alert.id}>{row}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
