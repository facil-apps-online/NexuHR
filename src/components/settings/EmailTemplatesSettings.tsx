import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, FileText, GraduationCap, Users, Package, ClipboardCheck, Stethoscope, Info } from "lucide-react";
import { toast } from "sonner";

interface EmailModuleConfig {
  enabled: boolean;
  daysBeforeExpiry: number;
  subject: string;
  body: string;
}

interface EmailTemplates {
  examenesVencer: EmailModuleConfig;
  cursosVencer: EmailModuleConfig;
  firmasPendientes: EmailModuleConfig;
  comitesVencer: EmailModuleConfig;
  dotacionEntrega: EmailModuleConfig;
  evaluacionesPendientes: EmailModuleConfig;
  vigilanciaSeguimiento: EmailModuleConfig;
}

const defaultTemplates: EmailTemplates = {
  examenesVencer: {
    enabled: true,
    daysBeforeExpiry: 30,
    subject: "Recordatorio: Exámenes médicos próximos a vencer",
    body: `Estimado/a {{nombre_empleado}},

Le informamos que su examen médico {{tipo_examen}} está próximo a vencer el {{fecha_vencimiento}}.

Por favor, comuníquese con el área de Seguridad y Salud en el Trabajo para programar su cita.

Atentamente,
{{nombre_empresa}}`,
  },
  cursosVencer: {
    enabled: true,
    daysBeforeExpiry: 30,
    subject: "Recordatorio: Certificación por vencer",
    body: `Estimado/a {{nombre_empleado}},

Le recordamos que su certificación en {{nombre_curso}} vence el {{fecha_vencimiento}}.

Es importante mantener sus certificaciones al día para cumplir con los requisitos del cargo.

Atentamente,
{{nombre_empresa}}`,
  },
  firmasPendientes: {
    enabled: false,
    daysBeforeExpiry: 7,
    subject: "Documento pendiente de firma",
    body: `Estimado/a {{nombre_empleado}},

Tiene un documento pendiente de firma: {{nombre_documento}}.

Por favor ingrese al sistema para revisar y firmar el documento.

Atentamente,
{{nombre_empresa}}`,
  },
  comitesVencer: {
    enabled: true,
    daysBeforeExpiry: 60,
    subject: "Recordatorio: Vencimiento de comité",
    body: `Estimado/a {{nombre_empleado}},

Le informamos que el comité {{nombre_comite}} está próximo a vencer el {{fecha_vencimiento}}.

Es necesario iniciar el proceso de renovación del comité.

Atentamente,
{{nombre_empresa}}`,
  },
  dotacionEntrega: {
    enabled: false,
    daysBeforeExpiry: 15,
    subject: "Recordatorio: Entrega de dotación programada",
    body: `Estimado/a {{nombre_empleado}},

Le recordamos que tiene programada una entrega de dotación: {{item_dotacion}}.

Fecha programada: {{fecha_entrega}}

Por favor acérquese al área correspondiente para recibir su dotación.

Atentamente,
{{nombre_empresa}}`,
  },
  evaluacionesPendientes: {
    enabled: false,
    daysBeforeExpiry: 10,
    subject: "Recordatorio: Evaluación de desempeño pendiente",
    body: `Estimado/a {{nombre_empleado}},

Tiene una evaluación de desempeño pendiente correspondiente al período {{periodo}}.

Por favor complete su evaluación antes del {{fecha_limite}}.

Atentamente,
{{nombre_empresa}}`,
  },
  vigilanciaSeguimiento: {
    enabled: true,
    daysBeforeExpiry: 7,
    subject: "Recordatorio: Seguimiento de vigilancia epidemiológica",
    body: `Estimado/a {{nombre_empleado}},

Le recordamos que tiene un seguimiento programado de vigilancia epidemiológica para {{tipo_vigilancia}}.

Fecha de seguimiento: {{fecha_seguimiento}}

Por favor comuníquese con el área de SST para confirmar su asistencia.

Atentamente,
{{nombre_empresa}}`,
  },
};

const templateTypes = [
  {
    key: "examenesVencer" as keyof EmailTemplates,
    title: "Exámenes por vencer",
    description: "Notificación de vencimiento de exámenes médicos",
    icon: Stethoscope,
    variables: ["nombre_empleado", "tipo_examen", "fecha_vencimiento", "nombre_empresa"],
  },
  {
    key: "cursosVencer" as keyof EmailTemplates,
    title: "Cursos y certificaciones por vencer",
    description: "Alerta de renovación de certificaciones",
    icon: GraduationCap,
    variables: ["nombre_empleado", "nombre_curso", "fecha_vencimiento", "nombre_empresa"],
  },
  {
    key: "firmasPendientes" as keyof EmailTemplates,
    title: "Firmas pendientes",
    description: "Recordatorio de documentos por firmar",
    icon: FileText,
    variables: ["nombre_empleado", "nombre_documento", "nombre_empresa"],
  },
  {
    key: "comitesVencer" as keyof EmailTemplates,
    title: "Vencimiento de comités",
    description: "Alerta de vencimiento de comités",
    icon: Users,
    variables: ["nombre_empleado", "nombre_comite", "fecha_vencimiento", "nombre_empresa"],
  },
  {
    key: "dotacionEntrega" as keyof EmailTemplates,
    title: "Entregas de dotación",
    description: "Recordatorio de entregas programadas",
    icon: Package,
    variables: ["nombre_empleado", "item_dotacion", "fecha_entrega", "nombre_empresa"],
  },
  {
    key: "evaluacionesPendientes" as keyof EmailTemplates,
    title: "Evaluaciones pendientes",
    description: "Notificación de evaluaciones sin completar",
    icon: ClipboardCheck,
    variables: ["nombre_empleado", "periodo", "fecha_limite", "nombre_empresa"],
  },
  {
    key: "vigilanciaSeguimiento" as keyof EmailTemplates,
    title: "Seguimiento vigilancia epidemiológica",
    description: "Recordatorio de seguimientos programados",
    icon: Stethoscope,
    variables: ["nombre_empleado", "tipo_vigilancia", "fecha_seguimiento", "nombre_empresa"],
  },
];

export function EmailTemplatesSettings() {
  const { currentAssignment, tenantId } = useAuth();
  const platformId = currentAssignment?.platform_id;
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<EmailTemplates>(defaultTemplates);

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant-email-templates", tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return null;
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("settings_data")
        .eq("tenant_id", tenantId)
        .eq("platform_id", platformId)
        .eq("setting_key", "email-templates")
        .maybeSingle();
      if (error) throw error;
      return data || { settings_data: {} };
    },
    enabled: !!tenantId && !!platformId,
  });

  useEffect(() => {
    if (tenantData?.settings_data) {
      const tenantSettings = tenantData.settings_data as Record<string, unknown>;
      if (tenantSettings.emailTemplates) {
        const saved = tenantSettings.emailTemplates as Partial<EmailTemplates>;
        const merged = { ...defaultTemplates };
        for (const key of Object.keys(defaultTemplates) as (keyof EmailTemplates)[]) {
          if (saved[key]) {
            merged[key] = { ...merged[key], ...saved[key] };
          }
        }
        setTemplates(merged);
      }
    }
  }, [tenantData]);

  const updateTemplatesMutation = useMutation({
    mutationFn: async (newTemplates: EmailTemplates) => {
      if (!tenantId || !platformId) throw new Error("No tenant");
      
      const currentSettings = (tenantData?.settings_data as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        emailTemplates: newTemplates,
      };

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({ 
          tenant_id: tenantId, 
          platform_id: platformId,
          setting_key: "email-templates",
          settings_data: JSON.parse(JSON.stringify(updatedSettings)) 
        }, { onConflict: "tenant_id,platform_id,setting_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-email-templates"] });
      toast.success("Configuración de correos guardada");
    },
    onError: () => {
      toast.error("Error al guardar la configuración");
    },
  });

  const handleFieldChange = (key: keyof EmailTemplates, field: string, value: any) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const resetToDefault = (key: keyof EmailTemplates) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: defaultTemplates[key],
    }));
    toast.info("Plantilla restaurada a valores predeterminados");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Correo</CardTitle>
        <CardDescription>
          Activa el envío de correos por módulo, define los días de anticipación y personaliza las plantillas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Variables disponibles</p>
              <p className="text-muted-foreground mt-1">
                Usa variables entre llaves dobles para personalizar los correos. Ejemplo: <code className="bg-muted px-1 rounded">{"{{nombre_empleado}}"}</code>
              </p>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {templateTypes.map((template) => {
            const Icon = template.icon;
            const config = templates[template.key];
            
            return (
              <AccordionItem key={template.key} value={template.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">{template.title}</p>
                      <p className="text-sm text-muted-foreground font-normal">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant={config.enabled ? "default" : "secondary"} className="shrink-0">
                      {config.enabled ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`enabled-${template.key}`}
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleFieldChange(template.key, "enabled", checked)}
                      />
                      <Label htmlFor={`enabled-${template.key}`}>Enviar correo</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`days-${template.key}`}>Días de anticipación</Label>
                      <Input
                        id={`days-${template.key}`}
                        type="number"
                        min={1}
                        max={365}
                        value={config.daysBeforeExpiry}
                        onChange={(e) => handleFieldChange(template.key, "daysBeforeExpiry", parseInt(e.target.value) || 1)}
                        className="w-24"
                        disabled={!config.enabled}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Variables:</span>
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="font-mono text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${template.key}`}>Asunto</Label>
                    <Input
                      id={`subject-${template.key}`}
                      value={config.subject}
                      onChange={(e) => handleFieldChange(template.key, "subject", e.target.value)}
                      placeholder="Asunto del correo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`body-${template.key}`}>Cuerpo del mensaje</Label>
                    <Textarea
                      id={`body-${template.key}`}
                      value={config.body}
                      onChange={(e) => handleFieldChange(template.key, "body", e.target.value)}
                      placeholder="Contenido del correo"
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetToDefault(template.key)}
                  >
                    Restaurar plantilla predeterminada
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Button 
          className="gradient-primary"
          onClick={() => updateTemplatesMutation.mutate(templates)}
          disabled={updateTemplatesMutation.isPending}
        >
          {updateTemplatesMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar configuración
        </Button>
      </CardContent>
    </Card>
  );
}
