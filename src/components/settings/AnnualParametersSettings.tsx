import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AnnualParametersSettings() {
  const queryClient = useQueryClient();
  const { currentAssignment } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [minimumWage, setMinimumWage] = useState("");
  const [transportAllowance, setTransportAllowance] = useState("");
  const [uvtValue, setUvtValue] = useState("");

  const { data: params, isLoading } = useQuery({
    queryKey: ["annual-parameters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_parameters" as any)
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const record = {
        tenant_id: currentAssignment?.tenant_id!,
        year: parseInt(year),
        minimum_wage: parseFloat(minimumWage) || 0,
        transport_allowance: parseFloat(transportAllowance) || 0,
        uvt_value: parseFloat(uvtValue) || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("annual_parameters" as any)
          .update(record)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("annual_parameters" as any)
          .insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Parámetros actualizados" : "Parámetros creados");
      queryClient.invalidateQueries({ queryKey: ["annual-parameters"] });
      resetForm();
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setYear(new Date().getFullYear().toString());
    setMinimumWage("");
    setTransportAllowance("");
    setUvtValue("");
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setYear(p.year.toString());
    setMinimumWage(p.minimum_wage.toString());
    setTransportAllowance(p.transport_allowance.toString());
    setUvtValue(p.uvt_value.toString());
    setShowForm(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Parámetros Anuales</CardTitle>
              <CardDescription>Salario mínimo, auxilio de transporte y UVT por año</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Año
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !params?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay parámetros configurados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Salario Mínimo</TableHead>
                <TableHead className="text-right">Auxilio Transporte</TableHead>
                <TableHead className="text-right">Valor UVT</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {params.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.year}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.minimum_wage)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.transport_allowance)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.uvt_value)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nuevos"} Parámetros Anuales</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Año *</Label>
              <Input type="number" value={year} onChange={e => setYear(e.target.value)} min="2020" max="2100" />
            </div>
            <div className="space-y-2">
              <Label>Salario Mínimo (COP) *</Label>
              <Input type="number" value={minimumWage} onChange={e => setMinimumWage(e.target.value)} placeholder="1300000" />
            </div>
            <div className="space-y-2">
              <Label>Auxilio de Transporte (COP) *</Label>
              <Input type="number" value={transportAllowance} onChange={e => setTransportAllowance(e.target.value)} placeholder="162000" />
            </div>
            <div className="space-y-2">
              <Label>Valor UVT (COP) *</Label>
              <Input type="number" value={uvtValue} onChange={e => setUvtValue(e.target.value)} placeholder="47065" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={!year || !minimumWage || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
