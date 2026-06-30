import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, PenTool, Info, FileImage } from "lucide-react";
import { toast } from "sonner";

const moduleIcons: Record<string, string> = {
  eventos: "📅",
  dotacion: "👕",
  cursos: "🎓",
  examenes: "🩺",
  vigilancias: "🔍",
  evaluaciones: "📋",
  comites: "👥",
  comunicaciones: "📨",
};

export function SignatureSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["modules-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, code, name, description, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ["tenant-settings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("tenant_id, settings_data")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return data || { tenant_id: profile.tenant_id, settings_data: {} };
    },
    enabled: !!profile?.tenant_id,
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

      const platformId = import.meta.env.VITE_PLATFORM_ID;
      if (!platformId) throw new Error("No platform_id found");

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({ 
          tenant_id: tenant.tenant_id,
          platform_id: platformId,
          settings_data: { ...currentSettings, [settingKey]: updated } 
        }, { onConflict: "tenant_id,platform_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast.success("Configuración actualizada");
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const isLoading = loadingModules || loadingTenant;
  const configurableModules = modules?.filter((m) => m.code !== "firmas") || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Firmas y Evidencias</h2>
        <p className="text-muted-foreground">
          Parametriza qué módulos requieren firma obligatoria y/o evidencias adjuntas.
        </p>
      </div>

      {/* Firmas Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Módulos con Firma</CardTitle>
              <CardDescription>
                Activa o desactiva la firma obligatoria para cada módulo. Los registros de módulos
                activados aparecerán en el Centro de Firmas cuando estén pendientes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : configurableModules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay módulos disponibles para configurar.
            </p>
          ) : (
            <div className="space-y-2">
              {configurableModules.map((mod) => {
                const isEnabled = signatureModules.includes(mod.code);
                const icon = moduleIcons[mod.code] || "📦";
                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="font-medium">{mod.name}</p>
                        {mod.description && (
                          <p className="text-sm text-muted-foreground">{mod.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEnabled && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">
                          Firma activa
                        </Badge>
                      )}
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ moduleCode: mod.code, enabled: checked, settingKey: "signature_modules" })
                        }
                        disabled={toggleMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidencias Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/50 p-2 text-accent-foreground">
              <FileImage className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Módulos con Evidencias</CardTitle>
              <CardDescription>
                Activa o desactiva la carga obligatoria de evidencias (fotos, PDFs, archivos) para cada módulo.
                Los registros sin evidencia aparecerán como pendientes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : configurableModules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay módulos disponibles para configurar.
            </p>
          ) : (
            <div className="space-y-2">
              {configurableModules.map((mod) => {
                const isEnabled = evidenceModules.includes(mod.code);
                const icon = moduleIcons[mod.code] || "📦";
                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="font-medium">{mod.name}</p>
                        {mod.description && (
                          <p className="text-sm text-muted-foreground">{mod.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEnabled && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          Evidencia activa
                        </Badge>
                      )}
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ moduleCode: mod.code, enabled: checked, settingKey: "evidence_modules" })
                        }
                        disabled={toggleMutation.isPending}
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
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>¿Cómo funciona?</strong> Al activar la firma en un módulo, todos los registros
              nuevos de ese módulo aparecerán como "pendientes de firma" en el Centro de Firmas.
              Los registros firmados quedarán protegidos y no podrán ser editados ni eliminados.
            </p>
            <p>
              Al activar evidencias en un módulo, cada registro permitirá adjuntar archivos (PDF, fotos, documentos)
              como soporte. Los registros sin evidencia se marcarán como pendientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
