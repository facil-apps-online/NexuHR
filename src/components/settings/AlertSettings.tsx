import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, FileText, GraduationCap, Users, Package, ClipboardCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";

interface AlertConfig {
  enabled: boolean;
  daysBeforeExpiry: number;
  emailNotification: boolean;
}

interface AlertSettings {
  examenesVencer: AlertConfig;
  cursosVencer: AlertConfig;
  firmasPendientes: AlertConfig;
  comitesVencer: AlertConfig;
  dotacionEntrega: AlertConfig;
  evaluacionesPendientes: AlertConfig;
  vigilanciaSeguimiento: AlertConfig;
}

const defaultSettings: AlertSettings = {
  examenesVencer: { enabled: true, daysBeforeExpiry: 30, emailNotification: true },
  cursosVencer: { enabled: true, daysBeforeExpiry: 30, emailNotification: true },
  firmasPendientes: { enabled: true, daysBeforeExpiry: 7, emailNotification: false },
  comitesVencer: { enabled: true, daysBeforeExpiry: 60, emailNotification: true },
  dotacionEntrega: { enabled: false, daysBeforeExpiry: 15, emailNotification: false },
  evaluacionesPendientes: { enabled: true, daysBeforeExpiry: 10, emailNotification: false },
  vigilanciaSeguimiento: { enabled: true, daysBeforeExpiry: 7, emailNotification: true },
};

const alertTypes = [
  {
    key: "examenesVencer" as keyof AlertSettings,
    title: "Exámenes por vencer",
    description: "Notificar cuando los exámenes médicos estén próximos a vencer",
    icon: Stethoscope,
  },
  {
    key: "cursosVencer" as keyof AlertSettings,
    title: "Cursos y certificaciones por vencer",
    description: "Alertar sobre cursos y certificaciones que requieren renovación",
    icon: GraduationCap,
  },
  {
    key: "firmasPendientes" as keyof AlertSettings,
    title: "Firmas pendientes",
    description: "Recordar documentos que requieren firma de empleados",
    icon: FileText,
  },
  {
    key: "comitesVencer" as keyof AlertSettings,
    title: "Vencimiento de comités",
    description: "Alertar cuando la vigencia de comités esté por terminar",
    icon: Users,
  },
  {
    key: "dotacionEntrega" as keyof AlertSettings,
    title: "Entregas de dotación",
    description: "Recordar entregas de dotación programadas",
    icon: Package,
  },
  {
    key: "evaluacionesPendientes" as keyof AlertSettings,
    title: "Evaluaciones pendientes",
    description: "Notificar sobre evaluaciones de desempeño sin completar",
    icon: ClipboardCheck,
  },
  {
    key: "vigilanciaSeguimiento" as keyof AlertSettings,
    title: "Seguimiento vigilancia epidemiológica",
    description: "Recordar seguimientos de casos en vigilancia",
    icon: Stethoscope,
  },
];

export function AlertSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant-alert-settings", profile?.tenant_id],
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
      if (tenantSettings.alerts) {
        setSettings({ ...defaultSettings, ...(tenantSettings.alerts as AlertSettings) });
      }
    }
  }, [tenantData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newAlertSettings: AlertSettings) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      
      const currentSettings = (tenantData?.settings_data as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        alerts: newAlertSettings,
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
      queryClient.invalidateQueries({ queryKey: ["tenant-alert-settings"] });
      toast.success("Configuración de alertas guardada");
    },
    onError: () => {
      toast.error("Error al guardar la configuración");
    },
  });

  const handleToggle = (key: keyof AlertSettings, field: "enabled" | "emailNotification") => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: !prev[key][field] },
    }));
  };

  const handleDaysChange = (key: keyof AlertSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], daysBeforeExpiry: value },
    }));
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
        <CardTitle>Configuración de Alertas</CardTitle>
        <CardDescription>
          Define cuándo y cómo recibir notificaciones del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {alertTypes.map((alert) => {
            const Icon = alert.icon;
            const config = settings[alert.key];
            
            return (
              <div
                key={alert.key}
                className="rounded-lg border border-border p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={() => handleToggle(alert.key, "enabled")}
                  />
                </div>
                
                {config.enabled && (
                  <div className="ml-12 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor={`days-${alert.key}`} className="text-sm">
                        Días de anticipación
                      </Label>
                      <Input
                        id={`days-${alert.key}`}
                        type="number"
                        min={1}
                        max={365}
                        value={config.daysBeforeExpiry}
                        onChange={(e) => handleDaysChange(alert.key, parseInt(e.target.value) || 1)}
                        className="w-24"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`email-${alert.key}`}
                        checked={config.emailNotification}
                        onCheckedChange={() => handleToggle(alert.key, "emailNotification")}
                      />
                      <Label htmlFor={`email-${alert.key}`} className="text-sm">
                        Notificar por email
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button 
          className="gradient-primary"
          onClick={() => updateSettingsMutation.mutate(settings)}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar preferencias
        </Button>
      </CardContent>
    </Card>
  );
}
