import { ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ResponsiveColumn<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
  /** Columna principal: título de la card en móvil */
  primary?: boolean;
  /** Subtítulo de la card en móvil (aparece debajo del primary) */
  subtitle?: boolean;
  /** Ocultar esta columna en móvil */
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  data: T[];
  /** Key única para cada fila */
  getKey: (item: T) => string;
  /** Click en la fila (desktop) o card (móvil) */
  onRowClick?: (item: T) => void;
  /** Contenido del actions dropdown en cada fila/card */
  actions?: (item: T) => ReactNode;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Clase adicional para el contenedor */
  className?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  getKey,
  onRowClick,
  actions,
  emptyMessage = "No hay registros",
  className,
}: ResponsiveTableProps<T>) {
  const desktopColumns = columns;
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);
  const primaryCol = columns.find((c) => c.primary);
  const subtitleCol = columns.find((c) => c.subtitle);
  const metaColumns = columns.filter((c) => !c.primary && !c.subtitle && !c.hideOnMobile);

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-card overflow-hidden", className)}>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {desktopColumns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.label}
                </TableHead>
              ))}
              {actions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow
                  key={getKey(item)}
                  className={cn("hover:bg-muted/30", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(item)}
                >
                  {desktopColumns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={desktopColumns.length + (actions ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {data.length > 0 ? (
          data.map((item) => (
            <div
              key={getKey(item)}
              className={cn(
                "p-4 space-y-2",
                onRowClick && "active:bg-muted/50"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {/* Primary + subtitle row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {primaryCol && (
                    <div className="font-medium truncate">{primaryCol.render(item)}</div>
                  )}
                  {subtitleCol && (
                    <div className="text-sm text-muted-foreground truncate">
                      {subtitleCol.render(item)}
                    </div>
                  )}
                </div>
                {actions && <div onClick={(e) => e.stopPropagation()}>{actions(item)}</div>}
              </div>

              {/* Meta fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {metaColumns.map((col) => (
                  <div key={col.key} className="min-w-0">
                    <span className="text-muted-foreground">{col.label}: </span>
                    <span className="truncate">{col.render(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
