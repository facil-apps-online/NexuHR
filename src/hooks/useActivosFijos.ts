import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ActivoFijoInput {
  tipo_id: string;
  marca_id: string;
  modelo: string;
  numero_serie?: string;
  estado_id?: string;
  empleado_asignado_id?: string | null;
  fecha_asignacion?: string | null;
  fecha_compra?: string | null;
  valor?: number | null;
  notas?: string;
}

export function useActivosFijos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const list = useQuery({
    queryKey: ["activos-fijos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos")
        .select("*, activo_fijo_tipos!inner(name), activo_fijo_estados!inner(name), activo_fijo_marcas!inner(name), employees(first_name, last_name, document_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (input: ActivoFijoInput) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user?.id)
        .single();

      const { data, error } = await supabase
        .from("activos_fijos")
        .insert({
          tenant_id: profile?.tenant_id,
          tipo_id: input.tipo_id,
          marca_id: input.marca_id,
          modelo: input.modelo,
          numero_serie: input.numero_serie || null,
          estado_id: input.estado_id || null,
          empleado_asignado_id: input.empleado_asignado_id || null,
          fecha_asignacion: input.fecha_asignacion || null,
          fecha_compra: input.fecha_compra || null,
          valor: input.valor || null,
          notas: input.notas || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo fijo registrado");
    },
    onError: (error) => {
      toast.error("Error al registrar activo fijo");
      console.error(error);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: ActivoFijoInput & { id: string }) => {
      const { data, error } = await supabase
        .from("activos_fijos")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo fijo actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar activo fijo");
      console.error(error);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activos_fijos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo fijo eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar activo fijo");
      console.error(error);
    },
  });

  const registrarEvento = async (
    activo_fijo_id: string,
    empleado_id: string | null,
    tipo_evento: string,
    descripcion?: string
  ) => {
    const { error } = await supabase.from("activos_fijos_historial").insert({
      activo_fijo_id,
      empleado_id,
      tipo_evento,
      descripcion,
    });
    if (error) throw error;
  };

  const assign = useMutation({
    mutationFn: async ({
      activoId,
      empleadoId,
    }: {
      activoId: string;
      empleadoId: string;
    }) => {
      const [{ data: disponibles }, { data: asignados }] = await Promise.all([
        supabase.from("activo_fijo_estados").select("id").eq("name", "Disponible").single(),
        supabase.from("activo_fijo_estados").select("id").eq("name", "Asignado").single(),
      ]);
      if (!disponibles?.id || !asignados?.id) throw new Error("Estados no encontrados");

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("activos_fijos")
        .update({
          empleado_asignado_id: empleadoId,
          estado_id: asignados.id,
          fecha_asignacion: now,
        })
        .eq("id", activoId)
        .eq("estado_id", disponibles.id)
        .select()
        .single();
      if (error) throw error;
      await registrarEvento(activoId, empleadoId, "asignacion", "Asignación desde el módulo de activos fijos");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo asignado correctamente");
    },
    onError: (error) => {
      toast.error("Error al asignar activo");
      console.error(error);
    },
  });

  const unassign = useMutation({
    mutationFn: async ({ activoId, empleadoId }: { activoId: string; empleadoId: string }) => {
      const { data: disponible } = await supabase
        .from("activo_fijo_estados").select("id").eq("name", "Disponible").single();
      if (!disponible?.id) throw new Error("Estado Disponible no encontrado");

      const { data, error } = await supabase
        .from("activos_fijos")
        .update({
          empleado_asignado_id: null,
          estado_id: disponible.id,
          fecha_asignacion: null,
        })
        .eq("id", activoId)
        .select()
        .single();
      if (error) throw error;
      await registrarEvento(activoId, empleadoId, "devolucion", "Devolución registrada");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Devolución registrada");
    },
    onError: (error) => {
      toast.error("Error al registrar devolución");
      console.error(error);
    },
  });

  const sendToRepair = useMutation({
    mutationFn: async ({ activoId, descripcion }: { activoId: string; descripcion?: string }) => {
      const { data: reparacion } = await supabase
        .from("activo_fijo_estados").select("id").eq("name", "En reparación").single();
      if (!reparacion?.id) throw new Error("Estado 'En reparación' no encontrado");

      const { data: activo } = await supabase
        .from("activos_fijos")
        .select("empleado_asignado_id")
        .eq("id", activoId)
        .single();
      if (!activo) throw new Error("Activo no encontrado");

      const { data, error } = await supabase
        .from("activos_fijos")
        .update({ estado_id: reparacion.id })
        .eq("id", activoId)
        .select()
        .single();
      if (error) throw error;
      await registrarEvento(activoId, activo.empleado_asignado_id, "reparacion", descripcion || "Enviado a reparación");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activos-fijos"] });
      toast.success("Activo enviado a reparación");
    },
    onError: (error) => {
      toast.error("Error al enviar a reparación");
      console.error(error);
    },
  });

  return {
    list,
    create,
    update,
    remove,
    assign,
    unassign,
    sendToRepair,
  };
}

export function useActivoFijo(id: string) {
  return useQuery({
    queryKey: ["activo-fijo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos")
        .select("*, activo_fijo_tipos!inner(name), activo_fijo_estados!inner(name), activo_fijo_marcas!inner(name), employees(first_name, last_name, document_number)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useActivoHistorial(activoId: string) {
  return useQuery({
    queryKey: ["activo-historial", activoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activos_fijos_historial")
        .select("*, employees(first_name, last_name)")
        .eq("activo_fijo_id", activoId)
        .order("fecha_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activoId,
  });
}
