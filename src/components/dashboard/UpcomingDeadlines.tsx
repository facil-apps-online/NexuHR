import { Calendar, Stethoscope, FileCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const typeConfig = {
  exam: { icon: Stethoscope, color: "text-primary bg-primary/10" },
  signature: { icon: FileCheck, color: "text-success bg-success/10" },
  committee: { icon: Users, color: "text-warning bg-warning/10" },
  training: { icon: Calendar, color: "text-info bg-info/10" },
};

export function UpcomingDeadlines({ referenceDate }: { referenceDate?: Date }) {
  const { data: stats } = useDashboardStats({ referenceDate });
  const deadlines = stats?.upcoming_deadlines ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Próximos Vencimientos</h3>
      </div>
      
      <div className="space-y-4">
        {deadlines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay vencimientos próximos
          </p>
        ) : (
          deadlines.map((deadline) => {
            const config = typeConfig[deadline.type as keyof typeof typeConfig] ?? typeConfig.training;
            const Icon = config.icon;
            
            return (
              <div
                key={deadline.id}
                className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50"
              >
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
