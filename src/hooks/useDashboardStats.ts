import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DashboardStatsBlock = {
  total?: number;
  total_active?: number;
  new_this_month?: number;
  new_last_month?: number;
  trend_pct?: number;
  vigente?: number;
  vencido?: number;
  proximo_vencer?: number;
  pendiente?: number;
  pct_vigente?: number;
  completado?: number;
  en_progreso?: number;
  pct_completado?: number;
  activa?: number;
  inactiva?: number;
  en_proceso?: number;
  completada?: number;
  cancelada?: number;
  pending?: number;
  enviado?: number;
  leido?: number;
  borrador?: number;
  sent_this_month?: number;
  unread?: number;
  urgent?: number;
  info?: number;
  [key: string]: number | undefined;
};

export type AlertItem = {
  id: string;
  type: "urgent" | "warning" | "info";
  title: string;
  description: string;
  count: number;
};

export type DeadlineItem = {
  id: string;
  title: string;
  type: "exam" | "signature" | "committee" | "training";
  date: string;
  days_left: number;
};

export type ComplianceModule = {
  module: string;
  scheduled: number;
  completed: number;
  percentage: number | null;
};

export type ComplianceData = {
  modules: ComplianceModule[];
  overall: {
    scheduled: number;
    completed: number;
    percentage: number | null;
  };
};

export type DashboardStats = {
  tenant_id?: string;
  reference_date?: string;
  timezone?: string;
  period_start?: string;
  period_end?: string;
  is_super_admin?: boolean;
  employees?: DashboardStatsBlock;
  exams?: DashboardStatsBlock;
  courses?: DashboardStatsBlock;
  vigilancias?: DashboardStatsBlock;
  evaluations?: DashboardStatsBlock;
  communications?: DashboardStatsBlock;
  notifications?: DashboardStatsBlock;
  alerts?: AlertItem[];
  alerts_total?: number;
  upcoming_deadlines?: DeadlineItem[];
  compliance?: ComplianceData;
};

export function useDashboardStats(params?: { referenceDate?: Date }) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", params?.referenceDate?.toISOString() ?? "current"],
    queryFn: async () => {
      const rpcParams: Record<string, unknown> = {};
      if (params?.referenceDate) {
        const d = params.referenceDate;
        rpcParams.p_reference_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      }
      const { data, error } = await supabase.rpc("get_dashboard_stats", rpcParams);
      if (error) throw error;
      return (data ?? {}) as DashboardStats;
    },
  });
}
