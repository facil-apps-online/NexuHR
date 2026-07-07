import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, PenTool, FileImage, Users, Stethoscope, ShieldCheck, Shirt, Monitor, GraduationCap, ClipboardCheck, CalendarCheck, FileSignature, Mail, UserCheck, HeartPulse, Banknote, BookOpen, LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

const moduleIcons: Record<string, LucideIcon> = {
  empleados: Users,
  examenes: Stethoscope,
  vigilancias: ShieldCheck,
  incapacidades: HeartPulse,
  dotacion: Shirt,
  activos_fijos: Monitor,
  cursos: GraduationCap,
  evaluaciones: ClipboardCheck,
  eventos: CalendarCheck,
  firmas: FileSignature,
  comites: UserCheck,
  comunicaciones: Mail,
  nomina: Banknote,
  reglamento: BookOpen,
};

const menuModules: Module[] = [
  { id: "activos_fijos", code: "activos_fijos", name: "Activos Fijos", description: "Inventario de activos" },
  { id: "cursos", code: "cursos", name: "Cursos", description: "Cursos y certificaciones" },
  { id: "dotacion", code: "dotacion", name: "Dotación", description: "Entrega de dotación" },
  { id: "evaluaciones", code: "evaluaciones", name: "Evaluaciones", description: "Evaluaciones de desempeño" },
  { id: "eventos", code: "eventos", name: "Eventos", description: "Registro de eventos" },
  { id: "examenes", code: "examenes", name: "Exámenes Médicos", description: "Exámenes ocupacionales" },
  { id: "incapacidades", code: "incapacidades", name: "Incapacidades", description: "Gestión de incapacidades" },
  { id: "reglamento", code: "reglamento", name: "Reglamento", description: "Reglamento interno" },
  { id: "vigilancias", code: "vigilancias", name: "Vigilancias", description: "Vigilancia epidemiológica" },
];

export function SignatureSettings() {
  const { currentAssignment, tenantId } = useAuth();
  const platformId = currentAssignment?.platform_id;
  const queryClient = useQueryClient();

  const modules = menuModules;

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ["tenant-settings-signatures", tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return null;
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("tenant_id, settings_data")
        .eq("tenant_id", tenantId)
        .eq("platform_id", platformId)
        .eq("setting_key", "signatures")
        .maybeSingle();
      if (error) throw error;
      return data || { tenant_id: tenantId, settings_data: {} };
    },
    enabled: !!tenantId && !!platformId,
  });

  const signatureModules: string[] =
    (tenant?.settings_data as any)?.signature_modules || [];
  const evidenceModules: string[] =
    (tenant?.settings_data as any)?.evidence_modules || [];

  const toggleMutation = useMutation({
    mutationFn: async ({ moduleCode, enabled, settingKey }: { moduleCode: string; enabled: boolean; settingKey: "signature_modules" | "evidence_modules" }) => {
      if (!tenant) throw new Error("Tenant no encontrado");

      const currentSettings = (tenant.settings_data as Record<string, any>) || {};
      const current: string[] = currentSettings[settingKey] || [];
      const updated = enabled
        ? [...current, moduleCode]
        : current.filter((c: string) => c !== moduleCode);

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({ 
          tenant_id: tenant.tenant_id,
          platform_id: platformId,
          setting_key: "signatures",
          settings_data: { ...currentSettings, [settingKey]: updated } 
        }, { onConflict: "tenant_id,platform_id,setting_key" });
      if (error) throw error;
    },
    onMutate: async ({ moduleCode, enabled, settingKey }) => {
      await queryClient.cancelQueries({ queryKey: ["tenant-settings-signatures", tenantId] });
      const previous = queryClient.getQueryData(["tenant-settings-signatures", tenantId]);

      queryClient.setQueryData(["tenant-settings-signatures", tenantId], (old: any) => {
        if (!old) return old;
        const data = old.settings_data as Record<string, any> || {};
        const current: string[] = data[settingKey] || [];
        data[settingKey] = enabled
          ? [...current, moduleCode]
          : current.filter((c: string) => c !== moduleCode);
        return { ...old, settings_data: { ...data } };
      });

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tenant-settings-signatures", tenantId], context.previous);
      }
      toast.error("Error: " + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings-signatures", tenantId] });
    },
  });

  const isLoading = loadingTenant;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Firmas y Evidencias por Módulo</h2>
        <p className="text-muted-foreground">
          Configura qué módulos requieren firma obligatoria y/o evidencias adjuntas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Configuración por Módulo</CardTitle>
              <CardDescription>
                Activa o desactiva la firma obligatoria y la carga de evidencias para cada módulo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex-1">Módulo</div>
                <div className="w-24 text-center">Firma</div>
                <div className="w-24 text-center">Evidencia</div>
              </div>

              {modules.map((mod) => {
                const Icon = moduleIcons[mod.code] || FileSignature;
                const hasSignature = signatureModules.includes(mod.code);
                const hasEvidence = evidenceModules.includes(mod.code);
                return (
                  <div
                    key={mod.id}
                    className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-secondary p-1.5 text-secondary-foreground shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{mod.name}</p>
                        {mod.description && (
                          <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex w-24 items-center justify-center">
                      <Switch
                        checked={hasSignature}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ moduleCode: mod.code, enabled: checked, settingKey: "signature_modules" })
                        }
                      />
                    </div>

                    <div className="flex w-24 items-center justify-center">
                      <Switch
                        checked={hasEvidence}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ moduleCode: mod.code, enabled: checked, settingKey: "evidence_modules" })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <FileImage className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Firma:</strong> Al activarla, los registros del módulo aparecerán como "pendientes de firma" en el Centro de Firmas. Los registros firmados quedan protegidos y no pueden editarse ni eliminarse.
            </p>
            <p>
              <strong>Evidencia:</strong> Al activarla, cada registro permitirá adjuntar archivos (PDF, fotos) como soporte. Los registros sin evidencia se marcarán como pendientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
