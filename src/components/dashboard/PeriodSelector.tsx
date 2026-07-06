import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subMonths } from "date-fns";

export type PeriodKey = "current" | "prev" | "quarter";

interface PeriodSelectorProps {
  value: PeriodKey;
  onChange: (key: PeriodKey, date: Date | undefined) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(key: PeriodKey) => {
        const now = new Date();
        switch (key) {
          case "current":
            onChange(key, undefined);
            break;
          case "prev":
            onChange(key, subMonths(now, 1));
            break;
          case "quarter":
            onChange(key, subMonths(now, 3));
            break;
        }
      }}
    >
      <SelectTrigger className="w-44 h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current">Este mes</SelectItem>
        <SelectItem value="prev">Mes anterior</SelectItem>
        <SelectItem value="quarter">Último trimestre</SelectItem>
      </SelectContent>
    </Select>
  );
}
