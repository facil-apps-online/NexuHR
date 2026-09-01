import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const cursoFormSchema = z.object({
  employee_id: z.string().min(1, "Seleccione un empleado"),
  course_name: z.string().min(1, "Ingrese el nombre del curso"),
  provider: z.string().optional(),
  start_date: z.string().min(1, "Ingrese la fecha de inicio"),
  end_date: z.string().optional(),
  expiry_date: z.string().optional(),
  duration_hours: z.coerce.number().optional(),
  grade: z.coerce.number().optional(),
  status: z.string().min(1, "Seleccione el estado"),
  observations: z.string().optional(),
});

type CursoFormValues = z.infer<typeof cursoFormSchema>;

interface CursoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso?: Tables<"courses"> | null;
  defaultEmployeeId?: string;
}

export function CursoForm({ open, onOpenChange, curso, defaultEmployeeId }: CursoFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!curso;
  const hasDefaultEmployee = !!defaultEmployeeId;

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

  const { data: providers } = useQuery({
    queryKey: ["course-providers-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_providers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: courseTypes } = useQuery({
    queryKey: ["course-types-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_types")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const form = useForm<CursoFormValues>({
    resolver: zodResolver(cursoFormSchema),
    defaultValues: {
      employee_id: "",
      course_name: "",
      provider: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      expiry_date: "",
      duration_hours: undefined,
      grade: undefined,
      status: "pendiente",
      observations: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employee_id: curso?.employee_id || defaultEmployeeId || "",
        course_name: curso?.course_name || "",
        provider: curso?.provider || "",
        start_date: curso?.start_date || new Date().toISOString().split("T")[0],
        end_date: curso?.end_date || "",
        expiry_date: curso?.expiry_date || "",
        duration_hours: curso?.duration_hours || undefined,
        grade: curso?.grade ? Number(curso.grade) : undefined,
        status: curso?.status || "pendiente",
        observations: curso?.observations || "",
      });
    }
  }, [curso, open, form, defaultEmployeeId]);

  const mutation = useMutation({
    mutationFn: async (values: CursoFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

      const payload = {
        employee_id: values.employee_id,
        course_name: values.course_name,
        provider: values.provider || null,
        start_date: values.start_date,
        end_date: values.end_date || null,
        expiry_date: values.expiry_date || null,
        duration_hours: values.duration_hours || null,
        grade: values.grade || null,
        status: values.status as any,
        observations: values.observations || null,
      };

      if (isEditing && curso) {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", curso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert({
          ...payload,
          tenant_id: profile.tenant_id,
          created_by: userData.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses-stats"] });
      queryClient.invalidateQueries({ queryKey: ["employee-courses"] });
      toast.success(
        isEditing ? "Curso actualizado correctamente" : "Curso registrado correctamente"
      );

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .single();
        const formValues = form.getValues();
        if (formValues.employee_id && profile?.tenant_id) {
          const { data: emp } = await supabase
            .from("employees" as any)
            .select("user_id, first_name, last_name")
            .eq("id", formValues.employee_id)
            .single();
          if (emp?.user_id) {
            await createNotification({
              userId: emp.user_id,
              tenantId: profile.tenant_id,
              title: isEditing ? "Curso actualizado" : "Curso asignado",
              message: isEditing
                ? `Su curso "${formValues.course_name}" fue actualizado.`
                : `Se le asignó el curso "${formValues.course_name}".`,
              type: "info",
            });
          }
        }
      } catch { /* silent */ }

      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Curso" : "Registrar Curso / Certificación"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing || hasDefaultEmployee}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Curso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de curso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courseTypes?.map((ct) => (
                        <SelectItem key={ct.id} value={ct.name}>
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad / Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers?.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Obtención</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (h)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 40" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calificación</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 95" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_progreso">En progreso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones adicionales..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gradient-primary">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Registrar Curso"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
