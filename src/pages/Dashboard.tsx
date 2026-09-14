import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AlertList } from "@/components/dashboard/AlertList";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { FabToolbox } from "@/components/dashboard/FabToolbox";
import { PeriodSelector, type PeriodKey } from "@/components/dashboard/PeriodSelector";
import { useDashboardStats } from "@/hooks/useDashboardStats";

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

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Panel Principal</h1>
            <p className="mt-1 text-muted-foreground">
              {periodLabel} &middot; Resumen del dashboard
            </p>
          </div>
          <PeriodSelector value={periodKey} onChange={handlePeriodChange} />
        </div>

        <StatsPanel stats={dashboardStats} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AlertList referenceDate={referenceDate} />
          <UpcomingDeadlines referenceDate={referenceDate} />
        </div>
      </div>

      <FabToolbox />
    </MainLayout>
  );
}
