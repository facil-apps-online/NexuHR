import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, FileText, GraduationCap, Users, Package, ClipboardCheck, Stethoscope, Info } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplates {
  examenesVencer: EmailTemplate;
  cursosVencer: EmailTemplate;
  firmasPendientes: EmailTemplate;
  comitesVencer: EmailTemplate;
  dotacionEntrega: EmailTemplate;
  evaluacionesPendientes: EmailTemplate;
  vigilanciaSeguimiento: EmailTemplate;
}

const defaultTemplates: EmailTemplates = {
  examenesVencer: {
    subject: "Recordatorio: Exámenes médicos próximos a vencer",
    body: `Estimado/a {{nombre_empleado}},

Le informamos que su examen médico {{tipo_examen}} está próximo a vencer el {{fecha_vencimiento}}.

Por favor, comuníquese con el área de Seguridad y Salud en el Trabajo para programar su cita.

Atentamente,
{{nombre_empresa}}`,
  },
  cursosVencer: {
    subject: "Recordatorio: Certificación por vencer",
    body: `Estimado/a {{nombre_empleado}},

Le recordamos que su certificación en {{nombre_curso}} vence el {{fecha_vencimiento}}.

Es importante mantener sus certificaciones al día para cumplir con los requisitos del cargo.

Atentamente,
{{nombre_empresa}}`,
  },
  firmasPendientes: {
    subject: "Documento pendiente de firma",
    body: `Estimado/a {{nombre_empleado}},

Tiene un documento pendiente de firma: {{nombre_documento}}.

Por favor ingrese al sistema para revisar y firmar el documento.

Atentamente,
{{nombre_empresa}}`,
  },
  comitesVencer: {
    subject: "Recordatorio: Vencimiento de comité",
    body: `Estimado/a {{nombre_empleado}},

Le informamos que el comité {{nombre_comite}} está próximo a vencer el {{fecha_vencimiento}}.

Es necesario iniciar el proceso de renovación del comité.

Atentamente,
{{nombre_empresa}}`,
  },
  dotacionEntrega: {
    subject: "Recordatorio: Entrega de dotación programada",
    body: `Estimado/a {{nombre_empleado}},

Le recordamos que tiene programada una entrega de dotación: {{item_dotacion}}.

Fecha programada: {{fecha_entrega}}

Por favor acérquese al área correspondiente para recibir su dotación.

Atentamente,
{{nombre_empresa}}`,
  },
  evaluacionesPendientes: {
    subject: "Recordatorio: Evaluación de desempeño pendiente",
    body: `Estimado/a {{nombre_empleado}},

Tiene una evaluación de desempeño pendiente correspondiente al período {{periodo}}.

Por favor complete su evaluación antes del {{fecha_limite}}.

Atentamente,
{{nombre_empresa}}`,
  },
  vigilanciaSeguimiento: {
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
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<EmailTemplates>(defaultTemplates);

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant-email-templates", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("settings_data")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return data || { settings_data: {} };
    },
    enabled: !!profile?.tenant_id,
  });

  useEffect(() => {
    if (tenantData?.settings_data) {
      const tenantSettings = tenantData.settings_data as Record<string, unknown>;
      if (tenantSettings.emailTemplates) {
        setTemplates({ ...defaultTemplates, ...(tenantSettings.emailTemplates as EmailTemplates) });
      }
    }
  }, [tenantData]);

  const updateTemplatesMutation = useMutation({
    mutationFn: async (newTemplates: EmailTemplates) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const currentSettings = (tenantData?.settings_data as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        emailTemplates: newTemplates,
      };

      const platformId = import.meta.env.VITE_PLATFORM_ID;
      if (!platformId) throw new Error("No platform_id found");

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({ 
          tenant_id: profile.tenant_id, 
          platform_id: platformId,
          settings_data: JSON.parse(JSON.stringify(updatedSettings)) 
        }, { onConflict: "tenant_id,platform_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-email-templates"] });
      toast.success("Plantillas de correo guardadas");
    },
    onError: () => {
      toast.error("Error al guardar las plantillas");
    },
  });

  const handleSubjectChange = (key: keyof EmailTemplates, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], subject: value },
    }));
  };

  const handleBodyChange = (key: keyof EmailTemplates, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], body: value },
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
        <CardTitle>Plantillas de Correo</CardTitle>
        <CardDescription>
          Personaliza los correos automáticos que envía el sistema para cada tipo de notificación
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
            const currentTemplate = templates[template.key];
            
            return (
              <AccordionItem key={template.key} value={template.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{template.title}</p>
                      <p className="text-sm text-muted-foreground font-normal">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
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
                      value={currentTemplate.subject}
                      onChange={(e) => handleSubjectChange(template.key, e.target.value)}
                      placeholder="Asunto del correo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`body-${template.key}`}>Cuerpo del mensaje</Label>
                    <Textarea
                      id={`body-${template.key}`}
                      value={currentTemplate.body}
                      onChange={(e) => handleBodyChange(template.key, e.target.value)}
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
          Guardar plantillas
        </Button>
      </CardContent>
    </Card>
  );
}
