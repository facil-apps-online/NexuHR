import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createNotification } from "@/lib/createNotification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface DotacionItem {
  item_name: string;
  item_type: string;
  size: string;
  quantity: number;
  expiry_date: string;
}

const emptyItem = (): DotacionItem => ({
  item_name: "",
  item_type: "",
  size: "",
  quantity: 1,
  expiry_date: "",
});

interface DotacionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dotacion?: Tables<"dotacion"> | null;
  defaultEmployeeId?: string;
}

export function DotacionForm({ open, onOpenChange, dotacion, defaultEmployeeId }: DotacionFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!dotacion;
  const hasDefaultEmployee = !!defaultEmployeeId;

  const [employeeId, setEmployeeId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<DotacionItem[]>([emptyItem()]);

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, document_number")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: dotacionTypes } = useQuery({
    queryKey: ["dotacion_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dotacion_types" as any)
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as unknown as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && dotacion) {
        setEmployeeId(dotacion.employee_id);
        setDeliveryDate(dotacion.delivery_date);
        setObservations(dotacion.observations || "");
        setItems([{
          item_name: dotacion.item_name,
          item_type: dotacion.item_type || "",
          size: dotacion.size || "",
          quantity: dotacion.quantity || 1,
          expiry_date: dotacion.expiry_date || "",
        }]);
      } else {
        setEmployeeId(defaultEmployeeId || "");
        setDeliveryDate(new Date().toISOString().split("T")[0]);
        setObservations("");
        setItems([emptyItem()]);
      }
    }
  }, [dotacion, open, defaultEmployeeId, isEditing]);

  const updateItem = (index: number, field: keyof DotacionItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Seleccione un empleado");
      if (!deliveryDate) throw new Error("Ingrese la fecha de entrega");
      
      const invalidItems = items.filter(it => !it.item_name.trim());
      if (invalidItems.length > 0) throw new Error("Todos los elementos deben tener nombre");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

      if (isEditing && dotacion) {
        const item = items[0];
        const { error } = await supabase
          .from("dotacion")
          .update({
            employee_id: employeeId,
            item_name: item.item_name,
            item_type: item.item_type || null,
            size: item.size || null,
            quantity: item.quantity,
            delivery_date: deliveryDate,
            expiry_date: item.expiry_date || null,
            observations: observations || null,
          })
          .eq("id", dotacion.id);
        if (error) throw error;
      } else {
        const records = items.map(item => ({
          employee_id: employeeId,
          item_name: item.item_name,
          item_type: item.item_type || null,
          size: item.size || null,
          quantity: item.quantity,
          delivery_date: deliveryDate,
          expiry_date: item.expiry_date || null,
          observations: observations || null,
          tenant_id: profile.tenant_id,
          created_by: userData.user!.id,
        }));
        const { error } = await supabase.from("dotacion").insert(records);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["dotacion"] });
      queryClient.invalidateQueries({ queryKey: ["dotacion-stats"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dotacion"] });
      toast.success(
        isEditing ? "Dotación actualizada correctamente" : `${items.length} elemento(s) registrado(s) correctamente`
      );

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .single();
        if (employeeId && profile?.tenant_id) {
          const { data: emp } = await supabase
            .from("employees" as any)
            .select("user_id, first_name, last_name")
            .eq("id", employeeId)
            .single();
          if (emp?.user_id) {
            const itemNames = items.map(i => i.item_name).join(", ");
            await createNotification({
              userId: emp.user_id,
              tenantId: profile.tenant_id,
              title: isEditing ? "Dotación actualizada" : "Dotación entregada",
              message: isEditing
                ? `Su dotación fue actualizada: ${itemNames}.`
                : `Se le entregó dotación: ${itemNames}.`,
              type: "info",
            });
          }
        }
      } catch { /* silent */ }

      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Dotación" : "Registrar Entrega de Dotación"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={isEditing || hasDefaultEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.document_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Entrega</Label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Elementos</Label>
              {!isEditing && (
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar elemento
                </Button>
              )}
            </div>

            {items.map((item, index) => (
              <div key={index} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Elemento {index + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(index)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre del elemento *</Label>
                    <Input
                      placeholder="Ej: Pantalón, Camisa, Botas"
                      value={item.item_name}
                      onChange={e => updateItem(index, "item_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={item.item_type} onValueChange={v => updateItem(index, "item_type", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {dotacionTypes?.map((dt) => (
                          <SelectItem key={dt.id} value={dt.name}>
                            {dt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Talla</Label>
                    <Input placeholder="Ej: M, 42" value={item.size} onChange={e => updateItem(index, "size", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha vencimiento</Label>
                    <Input type="date" value={item.expiry_date} onChange={e => updateItem(index, "expiry_date", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea placeholder="Observaciones adicionales..." rows={2} value={observations} onChange={e => setObservations(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gradient-primary">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : `Registrar ${items.length} elemento(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
