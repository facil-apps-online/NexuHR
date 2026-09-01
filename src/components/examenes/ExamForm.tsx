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

const examFormSchema = z.object({
  employee_id: z.string().min(1, "Seleccione un empleado"),
  exam_type: z.string().min(1, "Seleccione el tipo de examen"),
  scheduled_date: z.string().min(1, "Ingrese la fecha programada"),
  entity: z.string().optional(),
  observations: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

interface ExamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Tables<"exams"> | null;
  defaultEmployeeId?: string;
}

export function ExamForm({ open, onOpenChange, exam, defaultEmployeeId }: ExamFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!exam;
  const hasDefaultEmployee = !!defaultEmployeeId;

  const { data: examTypes, isLoading: loadingExamTypes } = useQuery({
    queryKey: ["exam-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_types")
        .select("id, name, is_standard")
        .eq("active", true)
        .order("is_standard", { ascending: false })
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: employees, isLoading: loadingEmployees } = useQuery({
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

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      employee_id: "",
      exam_type: "",
      scheduled_date: "",
      entity: "",
      observations: "",
    },
  });

  // Reset form when exam changes (for edit mode) or when defaultEmployeeId is provided
  useEffect(() => {
    if (open) {
      form.reset({
        employee_id: exam?.employee_id || defaultEmployeeId || "",
        exam_type: exam?.exam_type || "",
        scheduled_date: exam?.scheduled_date || exam?.exam_date || "",
        entity: exam?.entity || "",
        observations: exam?.observations || "",
      });
    }
  }, [exam, open, form, defaultEmployeeId]);

  const mutation = useMutation({
    mutationFn: async (values: ExamFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

      const examData = {
        employee_id: values.employee_id,
        exam_type: values.exam_type,
        scheduled_date: values.scheduled_date,
        exam_date: values.scheduled_date,
        entity: values.entity || null,
        observations: values.observations || null,
        tenant_id: profile.tenant_id,
        status: "pendiente" as const,
        created_by: userData.user.id,
      };

      if (isEditing && exam) {
        const { error } = await supabase
          .from("exams")
          .update({
            employee_id: values.employee_id,
            exam_type: values.exam_type,
            scheduled_date: values.scheduled_date,
            entity: values.entity || null,
            observations: values.observations || null,
          })
          .eq("id", exam.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert(examData);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-exam-stats"] });
      toast.success(
        isEditing
          ? "Examen actualizado correctamente"
          : "Examen programado correctamente"
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
            const examLabel = isEditing ? "Examen actualizado" : "Examen programado";
            const examMsg = isEditing
              ? `Su examen ${formValues.exam_type} fue actualizado.`
              : `Se le programó un examen ${formValues.exam_type} para el ${formValues.scheduled_date}.`;
            await createNotification({
              userId: emp.user_id,
              tenantId: profile.tenant_id,
              title: examLabel,
              message: examMsg,
              type: "info",
            });
          }
        }
      } catch { /* silent */ }

      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar el examen: " + error.message);
    },
  });

  const onSubmit = (values: ExamFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Examen" : "Programar Examen Médico"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingEmployees || hasDefaultEmployee}
                  >
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
              name="exam_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Examen</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingExamTypes ? (
                        <SelectItem value="" disabled>Cargando...</SelectItem>
                      ) : (
                        examTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Programada</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad / IPS</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: IPS Salud Total, Colsanitas..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="gradient-primary"
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Guardar Cambios" : "Programar Examen"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
