import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Activo = Tables<"activos_fijos">;
type LookupItem = { id: string; name: string };

interface ActivoFijoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activo?: Activo | null;
  onSuccess?: () => void;
}

export function ActivoFijoForm({ open, onOpenChange, activo, onSuccess }: ActivoFijoFormProps) {
  const [tipoId, setTipoId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!activo;

  const { data: tipos } = useQuery({
    queryKey: ["activo_fijo_tipos"],
    queryFn: async () => {
      const { data } = await supabase.from("activo_fijo_tipos").select("id, name").eq("active", true).order("name");
      return (data ?? []) as LookupItem[];
    },
    enabled: open,
  });

  const { data: marcas } = useQuery({
    queryKey: ["activo_fijo_marcas"],
    queryFn: async () => {
      const { data } = await supabase.from("activo_fijo_marcas").select("id, name").eq("active", true).order("name");
      return (data ?? []) as LookupItem[];
    },
    enabled: open,
  });

  const { data: estados } = useQuery({
    queryKey: ["activo_fijo_estados"],
    queryFn: async () => {
      const { data } = await supabase.from("activo_fijo_estados").select("id, name").eq("active", true).order("name");
      return (data ?? []) as LookupItem[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (activo) {
      setTipoId(activo.tipo_id);
      setMarcaId(activo.marca_id);
      setModelo(activo.modelo);
      setNumeroSerie(activo.numero_serie || "");
      setEstadoId(activo.estado_id);
      setFechaCompra(activo.fecha_compra || "");
      setValor(activo.valor ? String(activo.valor) : "");
      setNotas(activo.notas || "");
    } else {
      setTipoId(tipos?.[0]?.id ?? "");
      setMarcaId("");
      setModelo("");
      setNumeroSerie("");
      setEstadoId(estados?.[0]?.id ?? "");
      setFechaCompra("");
      setValor("");
      setNotas("");
    }
  }, [activo, open, tipos, estados]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId || !marcaId || !estadoId) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        tipo_id: tipoId,
        marca_id: marcaId,
        modelo,
        numero_serie: numeroSerie || null,
        estado_id: estadoId,
        fecha_compra: fechaCompra || null,
        valor: valor ? parseFloat(valor) : null,
        notas: notas || null,
      };

      if (isEditing && activo) {
        const { error } = await supabase.from("activos_fijos").update(payload).eq("id", activo.id);
        if (error) throw error;
        toast.success("Activo actualizado");
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { error } = await supabase.from("activos_fijos").insert({
          ...payload,
          tenant_id: profile?.tenant_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
        if (error) throw error;
        toast.success("Activo registrado");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el activo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Activo Fijo" : "Nuevo Activo Fijo"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los datos del activo fijo" : "Registra un nuevo activo fijo en el sistema"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={tipoId} onValueChange={setTipoId}>
                <SelectTrigger id="tipo"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(tipos ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={estadoId} onValueChange={setEstadoId}>
                <SelectTrigger id="estado"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(estados ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca *</Label>
              <Select value={marcaId} onValueChange={setMarcaId}>
                <SelectTrigger id="marca"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(marcas ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">Número de Serie</Label>
              <Input id="serie" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-compra">Fecha de Compra</Label>
              <Input id="fecha-compra" type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input id="valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gradient-primary" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Registrar Activo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
