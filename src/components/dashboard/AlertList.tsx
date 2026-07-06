import { AlertTriangle, Calendar, FileWarning, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function AlertList({ referenceDate }: { referenceDate?: Date }) {
  const { data: stats } = useDashboardStats({ referenceDate });
  const alerts: AlertItem[] = stats?.alerts ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Alertas Pendientes</h3>
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
          {stats?.alerts_total ?? 0} alertas
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay alertas pendientes
          </p>
        ) : (
          alerts.slice(0, 7).map((alert) => {
            const style = typeStyles[alert.type];
            const Icon = style.icon;
            
            return (
              <div
                key={alert.id}
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
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {alert.count > 0 ? `${alert.count} pendiente${alert.count !== 1 ? "s" : ""}` : ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
