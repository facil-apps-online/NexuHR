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
  examenesVencer: { enabled: true, daysBeforeExpiry: 30 },
  cursosVencer: { enabled: true, daysBeforeExpiry: 30 },
  firmasPendientes: { enabled: true, daysBeforeExpiry: 7 },
  comitesVencer: { enabled: true, daysBeforeExpiry: 60 },
  dotacionEntrega: { enabled: false, daysBeforeExpiry: 15 },
  evaluacionesPendientes: { enabled: true, daysBeforeExpiry: 10 },
  vigilanciaSeguimiento: { enabled: true, daysBeforeExpiry: 7 },
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
  const { currentAssignment, tenantId } = useAuth();
  const platformId = currentAssignment?.platform_id;
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant-alert-settings", tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return null;
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("settings_data")
        .eq("tenant_id", tenantId)
        .eq("platform_id", platformId)
        .eq("setting_key", "alerts")
        .maybeSingle();
      if (error) throw error;
      return data || { settings_data: {} };
    },
    enabled: !!tenantId && !!platformId,
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
      if (!tenantId || !platformId) throw new Error("No tenant");
      
      const currentSettings = (tenantData?.settings_data as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        alerts: newAlertSettings,
      };

      const { error } = await supabase
        .from("tenant_settings")
        .upsert({ 
          tenant_id: tenantId, 
          platform_id: platformId,
          setting_key: "alerts",
          settings_data: JSON.parse(JSON.stringify(updatedSettings)) 
        }, { onConflict: "tenant_id,platform_id,setting_key" });
      
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

  const handleToggle = (key: keyof AlertSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
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
          Define los días de anticipación para que el sistema genere alertas en la campanita
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
                    onCheckedChange={() => handleToggle(alert.key)}
                  />
                </div>
                
                {config.enabled && (
                  <div className="ml-12 pt-2 border-t border-border/50">
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
          Guardar alertas
        </Button>
      </CardContent>
    </Card>
  );
}
