import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const CHART_COLORS = {
  al_dia: "hsl(152, 60%, 40%)",
  por_vencer: "hsl(38, 92%, 50%)",
  vencido: "hsl(0, 72%, 51%)",
};

export function ComplianceChart() {
  const { data: stats } = useDashboardStats();
  const exams = stats?.exams;
  const total = exams?.total ?? 0;
  const vigente = exams?.vigente ?? 0;
  const proximo = exams?.proximo_vencer ?? 0;
  const vencido = exams?.vencido ?? 0;
  const upToDatePct = total > 0 ? Math.round((vigente / total) * 100) : 0;
  const expiringPct = total > 0 ? Math.round((proximo / total) * 100) : 0;
  const expiredPct = total > 0 ? Math.round((vencido / total) * 100) : 0;

  const chartData = [
    { name: "Al día", value: upToDatePct, color: CHART_COLORS.al_dia },
    { name: "Por vencer", value: expiringPct, color: CHART_COLORS.por_vencer },
    { name: "Vencido", value: expiredPct, color: CHART_COLORS.vencido },
  ].filter(d => d.value > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-lg font-semibold">Cumplimiento General</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              formatter={(value: number) => [`${value}%`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-3xl font-bold text-success">{upToDatePct}%</p>
        <p className="text-sm text-muted-foreground">
          Cumplimiento {total > 0 ? `${vigente} de ${total}` : ""}
        </p>
      </div>
    </div>
  );
}
