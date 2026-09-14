import { useMemo, useState } from "react";
import { Calendar, Stethoscope, FileCheck, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const typeConfig = {
  exam: { icon: Stethoscope, color: "text-primary bg-primary/10" },
  signature: { icon: FileCheck, color: "text-success bg-success/10" },
  committee: { icon: Users, color: "text-warning bg-warning/10" },
  training: { icon: Calendar, color: "text-info bg-info/10" },
};

const moduleLabels: Record<string, string> = {
  examenes: "Exámenes",
  cursos: "Cursos",
  comites: "Comités",
  dotacion: "Dotación",
};

const moduleRoutes: Record<string, string> = {
  examenes: "/examenes",
  cursos: "/cursos",
  comites: "/comites",
  dotacion: "/dotacion",
};

export function UpcomingDeadlines({ referenceDate }: { referenceDate?: Date }) {
  const { data: stats } = useDashboardStats({ referenceDate });
  const [activeModule, setActiveModule] = useState<string>("all");
  const deadlines = useMemo(() => stats?.upcoming_deadlines ?? [], [stats]);

  const moduleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    deadlines.forEach((d) => {
      const key = d.module ?? "otros";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [deadlines]);

  const filtered =
    activeModule === "all"
      ? deadlines
      : deadlines.filter((d) => (d.module ?? "otros") === activeModule);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Próximos Vencimientos</h3>
        <span className="rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
          {deadlines.length} próximos
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
          Todos ({deadlines.length})
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
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay vencimientos próximos
          </p>
        ) : (
          filtered.map((deadline) => {
            const config = typeConfig[deadline.type as keyof typeof typeConfig] ?? typeConfig.training;
            const Icon = config.icon;
            const route = moduleRoutes[deadline.module ?? ""];
            const row = (
              <div className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50">
                <div className={cn("rounded-lg p-2", config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{deadline.title}</p>
                  <p className="text-sm text-muted-foreground">{deadline.date}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
                    deadline.days_left <= 7
                      ? "bg-destructive/10 text-destructive"
                      : deadline.days_left <= 14
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {deadline.days_left} días
                </span>
                {route && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            );
            return route ? (
              <Link key={deadline.id} to={route} className="block">
                {row}
              </Link>
            ) : (
              <div key={deadline.id}>{row}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
