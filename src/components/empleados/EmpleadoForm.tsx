import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { EmployeePhotoUpload } from "@/components/EmployeePhotoUpload";

const employeeSchema = z.object({
  document_type: z.string().min(1, "Selecciona un tipo de documento"),
  document_number: z.string().min(1, "El número de documento es obligatorio").max(20, "Máximo 20 caracteres"),
  first_name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  last_name: z.string().min(1, "El apellido es obligatorio").max(100, "Máximo 100 caracteres"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  hire_date: z.string().optional().or(z.literal("")),
  termination_date: z.string().optional().or(z.literal("")),
  position: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  department: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  supervisor_id: z.string().optional().or(z.literal("")),
  address: z.string().max(255, "Máximo 255 caracteres").optional().or(z.literal("")),
  city: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  emergency_contact: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  emergency_phone: z.string().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmpleadoFormProps {
  employee?: (Tables<"employees"> & { supervisor_id?: string | null; termination_date?: string | null }) | null;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function EmpleadoForm({ employee, onSubmit, onCancel, isSubmitting }: EmpleadoFormProps) {
  const { currentAssignment } = useAuth();
  const tenantId = currentAssignment?.tenant_id;
  const platformId = currentAssignment?.platform_id;
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined | null>(employee?.photo_url);

  // Sync localPhotoUrl when employee prop changes (e.g., different employee selected)
  useEffect(() => {
    setLocalPhotoUrl(employee?.photo_url);
  }, [employee?.photo_url]);

  // Fetch per-tenant inactive items for standard master data
  const { data: inactiveSettings } = useQuery({
    queryKey: ["tenant_settings", "inactive_items", tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return {};
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("settings_data")
        .eq("tenant_id", tenantId)
        .eq("platform_id", platformId)
        .eq("setting_key", "inactive_items")
        .maybeSingle();
      if (error) throw error;
      return (data?.settings_data || {}) as Record<string, string[]>;
    },
    enabled: !!tenantId && !!platformId,
  });

  const inactiveDocTypes = inactiveSettings?.document_types || [];

  // Fetch document types (filtered by active + tenant inactive items)
  const { data: allDocumentTypes } = useQuery({
    queryKey: ["document_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const documentTypes = allDocumentTypes?.filter((item) => !inactiveDocTypes.includes(item.id));

  // Fetch positions
  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees for supervisor selection
  const { data: employees } = useQuery({
    queryKey: ["employees_for_supervisor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      document_type: employee?.document_type || "",
      document_number: employee?.document_number || "",
      first_name: employee?.first_name || "",
      last_name: employee?.last_name || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      birth_date: employee?.birth_date || "",
      hire_date: employee?.hire_date || "",
      termination_date: employee?.termination_date || "",
      position: employee?.position || "",
      department: employee?.department || "",
      supervisor_id: employee?.supervisor_id || "",
      address: employee?.address || "",
      city: employee?.city || "",
      emergency_contact: employee?.emergency_contact || "",
      emergency_phone: employee?.emergency_phone || "",
      active: employee?.active ?? true,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  // Filter out current employee from supervisor list
  const availableSupervisors = employees?.filter(e => e.id !== employee?.id) || [];

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto del empleado (only when editing existing) */}
        {employee?.id && tenantId && platformId && (
          <div className="flex justify-center pb-4 border-b">
            <EmployeePhotoUpload
              supabase={supabase}
              employeeId={employee.id}
              tenantId={tenantId}
              platformId={platformId}
              currentPhotoUrl={localPhotoUrl}
              employeeName={`${employee.first_name} ${employee.last_name}`}
              onPhotoUpdated={(fileId) => setLocalPhotoUrl(fileId)}
              size="lg"
            />
          </div>
        )}

        {/* Datos del documento */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Identificación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="document_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes?.map((dt) => (
                        <SelectItem key={dt.id} value={dt.code}>
                          {dt.code} - {dt.name}
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
              name="document_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de documento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Datos personales */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Datos Personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl>
                    <Input placeholder="Apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Estado activo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Información de contacto */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Información de Contacto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 3001234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección de residencia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Información laboral */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Información Laboral
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cargo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions?.map((pos) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name}
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
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área / Departamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="supervisor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jefe Directo</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} 
                    value={field.value || "_none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar supervisor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin jefe directo</SelectItem>
                      {availableSupervisors.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
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
              name="hire_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de ingreso</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="termination_date"
            render={({ field }) => (
              <FormItem className="sm:w-1/2">
                <FormLabel>Fecha de retiro</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contacto de emergencia */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Contacto de Emergencia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergency_contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del contacto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergency_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de emergencia</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gradient-primary">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {employee ? "Guardar cambios" : "Crear empleado"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
