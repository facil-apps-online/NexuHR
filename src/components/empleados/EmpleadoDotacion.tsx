import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parse, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import { Shirt, Loader2, FileX, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotacionForm } from "@/components/dotacion/DotacionForm";

interface EmpleadoDotacionProps {
  employeeId: string;
}

export function EmpleadoDotacion({ employeeId }: EmpleadoDotacionProps) {
  const [showForm, setShowForm] = useState(false);
  const [viewSignatureUrl, setViewSignatureUrl] = useState<string | null>(null);

  const { data: dotacion, isLoading } = useQuery({
    queryKey: ["employee-dotacion", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dotacion")
        .select("*")
        .eq("employee_id", employeeId)
        .order("delivery_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    const parsed = parse(date, "yyyy-MM-dd", new Date());
    return format(parsed, "d MMM yyyy", { locale: es });
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return <Badge variant="outline">Sin vencimiento</Badge>;
    const isExpired = isPast(safeNewDate(expiryDate));
    if (isExpired) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>;
    }
    return <Badge className="bg-success/10 text-success border-success/20">Vigente</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-primary" />
            Historial de Dotación
          </CardTitle>
          <Button size="sm" className="gradient-primary" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Registrar Entrega
          </Button>
        </CardHeader>
        <CardContent>
          {!dotacion || dotacion.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2" />
              <p>No hay dotación registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elemento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Firma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dotacion.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.item_type || "-"}</TableCell>
                    <TableCell>{item.size || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatDate(item.delivery_date)}</TableCell>
                    <TableCell>{formatDate(item.expiry_date)}</TableCell>
                    <TableCell>{getExpiryStatus(item.expiry_date)}</TableCell>
                    <TableCell>
                      {item.signature_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => {
                            const { data } = supabase.storage
                              .from("signatures")
                              .getPublicUrl(item.signature_url!);
                            setViewSignatureUrl(data.publicUrl);
                          }}
                        >
                          <Badge className="bg-success/10 text-success border-success/20 cursor-pointer">
                            <Eye className="mr-1 h-3 w-3" />
                            Ver Firma
                          </Badge>
                        </Button>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <DotacionForm
          open={showForm}
          onOpenChange={setShowForm}
          defaultEmployeeId={employeeId}
        />
      </Card>

      <Dialog open={!!viewSignatureUrl} onOpenChange={() => setViewSignatureUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firma Digital</DialogTitle>
          </DialogHeader>
          {viewSignatureUrl && (
            <div className="flex justify-center p-4">
              <img
                src={viewSignatureUrl}
                alt="Firma digital"
                className="max-w-full max-h-64 rounded-lg border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}