import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const moduleColors: Record<string, string> = {
  examenes: "bg-blue-500",
  cursos: "bg-emerald-500",
  evaluaciones: "bg-purple-500",
  dotacion: "bg-amber-500",
};

const moduleLabels: Record<string, string> = {
  examenes: "Exámenes",
  cursos: "Cursos",
  evaluaciones: "Evaluaciones",
  dotacion: "Dotación",
};

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export function ComplianceBars({ referenceDate }: { referenceDate?: Date }) {
  const { data: stats } = useDashboardStats({ referenceDate });
  const modules = stats?.compliance?.modules ?? [];
  const overall = stats?.compliance?.overall;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-lg font-semibold">Cumplimiento por Módulo</h3>

      <div className="space-y-4">
        {modules.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin datos de cumplimiento este período
          </p>
        ) : (
          modules.map((mod) => {
            const pct = mod.percentage ?? 0;
            return (
              <div key={mod.module}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{moduleLabels[mod.module] ?? mod.module}</span>
                  <span className="text-muted-foreground">
                    {mod.completed}/{mod.scheduled}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Bar value={pct} color={moduleColors[mod.module] ?? "bg-primary"} />
                  <span
                    className={cn(
                      "w-10 text-right text-sm font-semibold tabular-nums",
                      pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {overall && (
        <>
          <div className="my-4 border-t border-border" />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold">Overall</span>
              <span className="text-muted-foreground">
                {overall.completed}/{overall.scheduled}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Bar value={overall.percentage ?? 0} color="bg-primary" />
              <span
                className={cn(
                  "w-10 text-right text-base font-bold tabular-nums",
                  (overall.percentage ?? 0) >= 80 ? "text-success" : (overall.percentage ?? 0) >= 50 ? "text-warning" : "text-destructive"
                )}
              >
                {overall.percentage ?? 0}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
