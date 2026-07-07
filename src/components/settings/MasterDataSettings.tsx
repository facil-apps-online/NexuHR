import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, FileText, Briefcase, Building2, Loader2, Activity, Stethoscope, Lock, GraduationCap, BookOpen, HardHat, Users, CalendarCheck, ClipboardCheck, Monitor, Package, Wrench, EyeOff, Eye, HeartPulse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type MasterDataType = "document_types" | "positions" | "departments" | "vigilancia_types" | "exam_types" | "course_providers" | "course_types" | "dotacion_types" | "committee_roles" | "event_types" | "evaluation_types" | "activo_fijo_tipos" | "activo_fijo_estados" | "activo_fijo_marcas" | "incapacidad_types";

interface MasterDataItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  active: boolean;
  is_standard?: boolean;
}

interface MasterDataFormProps {
  type: MasterDataType;
  item?: MasterDataItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function MasterDataForm({ type, item, onSuccess, onCancel }: MasterDataFormProps) {
  const [name, setName] = useState(item?.name || "");
  const [code, setCode] = useState(item?.code || "");
  const [description, setDescription] = useState(item?.description || "");
  const [active, setActive] = useState(item?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

      if (item) {
        // Don't allow editing standard items
        if (item.is_standard) {
          toast.error("No se pueden editar los tipos estándar del sistema");
          setIsSubmitting(false);
          return;
        }
        
        if (type === "document_types") {
          const { error } = await supabase
            .from("document_types")
            .update({ name, active, code, tenant_id: profile.tenant_id })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "exam_types") {
          const { error } = await supabase
            .from("exam_types")
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "positions") {
          const { error } = await supabase
            .from("positions")
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "departments") {
          const { error } = await supabase
            .from("departments")
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "vigilancia_types") {
          const { error } = await supabase
            .from("vigilancia_types")
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "course_providers") {
          const { error } = await supabase
            .from("course_providers" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "course_types") {
          const { error } = await supabase
            .from("course_types" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "dotacion_types") {
          const { error } = await supabase
            .from("dotacion_types" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "committee_roles") {
          const { error } = await supabase
            .from("committee_roles" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "event_types") {
          const { error } = await supabase
            .from("event_types" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "evaluation_types") {
          const { error } = await supabase
            .from("evaluation_types" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "activo_fijo_tipos") {
          const { error } = await supabase
            .from("activo_fijo_tipos" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "activo_fijo_estados") {
          const { error } = await supabase
            .from("activo_fijo_estados" as any)
            .update({ name, active, description })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "activo_fijo_marcas") {
          const { error } = await supabase
            .from("activo_fijo_marcas" as any)
            .update({ name, active })
            .eq("id", item.id);
          if (error) throw error;
        } else if (type === "incapacidad_types") {
          const { error } = await supabase
            .from("incapacidad_types" as any)
            .update({ name, active, description, code })
            .eq("id", item.id);
          if (error) throw error;
        }
        toast.success("Registro actualizado");
      } else {
        if (type === "document_types") {
          const { error } = await supabase
            .from("document_types")
            .insert([{ name, active, code, tenant_id: profile.tenant_id }]);
          if (error) throw error;
        } else if (type === "exam_types") {
          const { error } = await supabase
            .from("exam_types")
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "positions") {
          const { error } = await supabase
            .from("positions")
            .insert([{ name, active, description, tenant_id: profile.tenant_id }]);
          if (error) throw error;
        } else if (type === "departments") {
          const { error } = await supabase
            .from("departments")
            .insert([{ name, active, description, tenant_id: profile.tenant_id }]);
          if (error) throw error;
        } else if (type === "vigilancia_types") {
          const { error } = await supabase
            .from("vigilancia_types")
            .insert([{ name, active, description, tenant_id: profile.tenant_id }]);
          if (error) throw error;
        } else if (type === "course_providers") {
          const { error } = await supabase
            .from("course_providers" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "course_types") {
          const { error } = await supabase
            .from("course_types" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "dotacion_types") {
          const { error } = await supabase
            .from("dotacion_types" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "committee_roles") {
          const { error } = await supabase
            .from("committee_roles" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "event_types") {
          const { error } = await supabase
            .from("event_types" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "evaluation_types") {
          const { error } = await supabase
            .from("evaluation_types" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "activo_fijo_tipos") {
          const { error } = await supabase
            .from("activo_fijo_tipos" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "activo_fijo_estados") {
          const { error } = await supabase
            .from("activo_fijo_estados" as any)
            .insert([{ name, active, description, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "activo_fijo_marcas") {
          const { error } = await supabase
            .from("activo_fijo_marcas" as any)
            .insert([{ name, active, tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        } else if (type === "incapacidad_types") {
          const { error } = await supabase
            .from("incapacidad_types" as any)
            .insert([{ name, active, description, code: code || 'OTRO', tenant_id: profile.tenant_id, is_standard: false }]);
          if (error) throw error;
        }
        toast.success("Registro creado");
      }

      queryClient.invalidateQueries({ queryKey: [type] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === "document_types" && (
        <div className="space-y-2">
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: CC, CE, PA"
            maxLength={10}
            required
          />
        </div>
      )}
      {type === "incapacidad_types" && (
        <div className="space-y-2">
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: EG, LM, OTRO"
            maxLength={10}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "document_types" ? "Ej: Cédula de Ciudadanía" : "Nombre"}
          required
        />
      </div>
      {type !== "document_types" && (
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="active">Activo</Label>
        <Switch id="active" checked={active} onCheckedChange={setActive} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {item ? "Guardar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}

interface MasterDataListProps {
  type: MasterDataType;
  title: string;
  description: string;
  icon: React.ReactNode;
  hasStandardItems?: boolean;
}

function MasterDataList({ type, title, description, icon, hasStandardItems = false }: MasterDataListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const queryClient = useQueryClient();
  const { currentAssignment } = useAuth();
  const tenantId = currentAssignment?.tenant_id;
  const platformId = currentAssignment?.platform_id;

  const { data: items, isLoading } = useQuery({
    queryKey: [type],
    queryFn: async () => {
      const query = supabase
        .from(type)
        .select("*")
        .order("name");
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterDataItem[];
    },
  });

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
    enabled: hasStandardItems && !!tenantId && !!platformId,
  });

  const inactiveIds = hasStandardItems ? (inactiveSettings?.[type] || []) : [];

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from(type)
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      if (!tenantId || !platformId) throw new Error("Tenant no disponible");
      const currentInactive = inactiveSettings?.[type] || [];
      const updatedInactive = visible
        ? currentInactive.filter(i => i !== id)
        : [...currentInactive, id];

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({
          tenant_id: tenantId,
          platform_id: platformId,
          setting_key: "inactive_items",
          settings_data: { ...inactiveSettings, [type]: updatedInactive },
        }, { onConflict: "tenant_id, platform_id, setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_settings", "inactive_items", tenantId] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const handleEdit = (item: MasterDataItem) => {
    if (item.is_standard) {
      toast.error("No se pueden editar los tipos estándar del sistema");
      return;
    }
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  // Separate standard and custom items for display — all items always visible in settings
  const standardItems = hasStandardItems ? items?.filter(item => item.is_standard) : [];
  const customItems = hasStandardItems ? items?.filter(item => !item.is_standard) : items;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingItem(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Nuevo"}
                </DialogTitle>
              </DialogHeader>
              <MasterDataForm
                type={type}
                item={editingItem}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay registros. Agrega el primero.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Standard items section */}
            {hasStandardItems && standardItems && standardItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Lock className="h-4 w-4" />
                  <span>Tipos estándar del sistema</span>
                </div>
                {standardItems.map((item) => {
                  const isHidden = inactiveIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border bg-muted/30 ${isHidden ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          Estándar
                        </Badge>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        {isHidden && (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                            Oculto en formularios
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!isHidden}
                          onCheckedChange={(checked) =>
                            toggleVisibility.mutate({ id: item.id, visible: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled
                          className="opacity-50"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom items section */}
            {customItems && customItems.length > 0 && (
              <div className="space-y-2">
                {hasStandardItems && standardItems && standardItems.length > 0 && (
                  <div className="text-sm text-muted-foreground mb-2 mt-4">
                    Tipos personalizados de tu empresa
                  </div>
                )}
                {customItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {type === "document_types" && item.code && (
                        <Badge variant="outline" className="font-mono">
                          {item.code}
                        </Badge>
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: item.id, active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show message if only standard items exist */}
            {hasStandardItems && (!customItems || customItems.length === 0) && standardItems && standardItems.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2 mt-4">
                Puedes agregar tipos personalizados para tu empresa usando el botón "Agregar".
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MasterDataSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Datos Maestros</h2>
        <p className="text-muted-foreground">
          Configura los datos maestros del sistema. Los tipos estándar están disponibles para todos los tenants y pueden ocultarse. Puedes agregar tipos personalizados para tu empresa.
        </p>
      </div>

      <Tabs defaultValue="generales" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="generales" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Generales
          </TabsTrigger>
          <TabsTrigger value="modulos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Por Módulo
          </TabsTrigger>
        </TabsList>

        {/* ──────── GENERALES ──────── */}
        <TabsContent value="generales" className="space-y-6">
          <MasterDataList
            type="document_types"
            title="Tipos de Documento"
            description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
            hasStandardItems={true}
          />
          <MasterDataList
            type="positions"
            title="Cargos"
            description="Define los cargos disponibles para los empleados"
            icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
          />
          <MasterDataList
            type="departments"
            title="Áreas"
            description="Define las áreas o departamentos de la empresa"
            icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
          />
        </TabsContent>

        {/* ──────── POR MÓDULO ──────── */}
        <TabsContent value="modulos">
          <Tabs defaultValue="vigilancia_types" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="vigilancia_types" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Vigilancias
              </TabsTrigger>
              <TabsTrigger value="exam_types" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Exámenes
              </TabsTrigger>
              <TabsTrigger value="course_providers" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Cursos
              </TabsTrigger>
              <TabsTrigger value="dotacion_types" className="flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                Dotación
              </TabsTrigger>
              <TabsTrigger value="committee_roles" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Comités
              </TabsTrigger>
              <TabsTrigger value="event_types" className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Eventos
              </TabsTrigger>
              <TabsTrigger value="evaluation_types" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Evaluaciones
              </TabsTrigger>
              <TabsTrigger value="incapacidad_types" className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                Incapacidades
              </TabsTrigger>
              <TabsTrigger value="activos_fijos" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Activos Fijos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vigilancia_types">
              <MasterDataList
                type="vigilancia_types"
                title="Tipos de Vigilancia"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<Activity className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="exam_types">
              <MasterDataList
                type="exam_types"
                title="Tipos de Examen"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<Stethoscope className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="course_providers" className="space-y-6">
              <MasterDataList
                type={"course_providers" as MasterDataType}
                title="Proveedores de Cursos"
                description="Los proveedores estándar están disponibles para todos. Puedes agregar proveedores personalizados."
                icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
              <MasterDataList
                type={"course_types" as MasterDataType}
                title="Tipos de Curso"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="dotacion_types">
              <MasterDataList
                type={"dotacion_types" as MasterDataType}
                title="Tipos de Dotación"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<HardHat className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="committee_roles">
              <MasterDataList
                type={"committee_roles" as MasterDataType}
                title="Roles de Comité"
                description="Los roles estándar están disponibles para todos. Puedes agregar roles personalizados."
                icon={<Users className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="event_types">
              <MasterDataList
                type={"event_types" as MasterDataType}
                title="Tipos de Evento"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<CalendarCheck className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="evaluation_types">
              <MasterDataList
                type={"evaluation_types" as MasterDataType}
                title="Tipos de Evaluación"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<ClipboardCheck className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="incapacidad_types">
              <MasterDataList
                type={"incapacidad_types" as MasterDataType}
                title="Tipos de Incapacidad"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<HeartPulse className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
            </TabsContent>

            <TabsContent value="activos_fijos" className="space-y-6">
              <MasterDataList
                type={"activo_fijo_tipos" as MasterDataType}
                title="Tipos de Activo Fijo"
                description="Los tipos estándar están disponibles para todos. Puedes agregar tipos personalizados."
                icon={<Package className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
              <MasterDataList
                type={"activo_fijo_estados" as MasterDataType}
                title="Estados de Activo Fijo"
                description="Los estados estándar están disponibles para todos. Puedes agregar estados personalizados."
                icon={<Wrench className="h-5 w-5 text-muted-foreground" />}
                hasStandardItems={true}
              />
              <MasterDataList
                type={"activo_fijo_marcas" as MasterDataType}
                title="Marcas de Activo Fijo"
                description="Gestiona las marcas disponibles para los activos fijos."
                icon={<Monitor className="h-5 w-5 text-muted-foreground" />}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}