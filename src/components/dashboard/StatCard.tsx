import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  progress?: {
    value: number;
    invert?: boolean;
    label?: string;
  };
  embedded?: boolean;
}

const variantStyles = {
  default: "bg-card border-border",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  danger: "bg-destructive/5 border-destructive/20",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

function progressColor(value: number, invert?: boolean) {
  if (invert) {
    if (value <= 10) return "bg-success";
    if (value <= 30) return "bg-warning";
    return "bg-destructive";
  }
  if (value >= 80) return "bg-success";
  if (value >= 50) return "bg-warning";
  return "bg-destructive";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  trend,
  variant = "default",
  progress,
  embedded = false,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border p-6 transition-all duration-200 card-interactive",
        embedded ? "" : "shadow-card hover:shadow-card-hover",
        href && "cursor-pointer",
        variantStyles[variant],
        embedded && variant === "default" && "bg-background/40 hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : "-"}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs. mes anterior</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-3", iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {progress && (
        <div className="mt-4 space-y-1.5">
          {progress.label && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.label}</span>
              <span className="font-semibold tabular-nums">{progress.value}%</span>
            </div>
          )}
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", progressColor(progress.value, progress.invert))}
              style={{ width: `${Math.min(Math.max(progress.value, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
