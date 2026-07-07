import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as mainSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";

interface NotificationPreference {
  id?: string;
  user_id?: string;
  tenant_id: string;
  receive_summary: boolean;
  summary_frequency: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

interface Props {
  supabase?: SupabaseClient;
  tenantId?: string;
  userId?: string;
  showSummary?: boolean;
}

export default function NotificationPreferencesSettings({ supabase: customSupabase, tenantId: customTenantId, userId: customUserId, showSummary = true }: Props = {}) {
  const { user: authUser, currentAssignment } = useAuth();
  const sb = customSupabase ?? mainSupabase;
  const tenantId = customTenantId ?? currentAssignment?.tenant_id;
  const userId = customUserId ?? authUser?.id;

  const queryClient = useQueryClient();

  const { data: userPreference, isLoading: loadingUserPref } = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: async () => {
      if (!userId || !tenantId) return null;

      const { data, error } = await sb
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!tenantId,
  });

  const [personalPrefs, setPersonalPrefs] = useState<NotificationPreference>({
    tenant_id: tenantId || "",
    receive_summary: false,
    summary_frequency: "daily",
    email_enabled: true,
    in_app_enabled: true,
  });

  useEffect(() => {
    if (userPreference) {
      setPersonalPrefs({
        id: userPreference.id,
        user_id: userPreference.user_id,
        tenant_id: userPreference.tenant_id,
        receive_summary: userPreference.receive_summary ?? false,
        summary_frequency: userPreference.summary_frequency ?? "daily",
        email_enabled: userPreference.email_enabled ?? true,
        in_app_enabled: userPreference.in_app_enabled ?? true,
      });
    } else if (tenantId) {
      setPersonalPrefs(prev => ({ ...prev, tenant_id: tenantId }));
    }
  }, [userPreference, tenantId]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: NotificationPreference) => {
      if (prefs.id) {
        const { error } = await sb
          .from("notification_preferences")
          .update({
            receive_summary: prefs.receive_summary,
            summary_frequency: prefs.summary_frequency,
            email_enabled: prefs.email_enabled,
            in_app_enabled: prefs.in_app_enabled,
          })
          .eq("id", prefs.id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from("notification_preferences")
          .insert({
            user_id: userId!,
            tenant_id: prefs.tenant_id,
            receive_summary: prefs.receive_summary,
            summary_frequency: prefs.summary_frequency,
            email_enabled: prefs.email_enabled,
            in_app_enabled: prefs.in_app_enabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Preferencias guardadas correctamente");
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (error) => {
      toast.error("Error al guardar preferencias");
      console.error(error);
    },
  });

  const bothDisabled = !personalPrefs.in_app_enabled && !personalPrefs.email_enabled;

  if (loadingUserPref) {
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
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferencias de notificaciones
        </CardTitle>
        <CardDescription>
          Configura cómo y cuándo deseas recibir las notificaciones del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificaciones en la aplicación</Label>
            <p className="text-sm text-muted-foreground">
              Recibir notificaciones dentro de la plataforma
            </p>
          </div>
          <Switch
            checked={personalPrefs.in_app_enabled}
            onCheckedChange={(checked) => setPersonalPrefs(prev => ({ ...prev, in_app_enabled: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificaciones por email</Label>
            <p className="text-sm text-muted-foreground">
              Recibir alertas importantes por correo electrónico
            </p>
          </div>
          <Switch
            checked={personalPrefs.email_enabled}
            onCheckedChange={(checked) => setPersonalPrefs(prev => ({ ...prev, email_enabled: checked }))}
          />
        </div>

        {bothDisabled && (
          <p className="text-sm text-destructive">
            Debe seleccionar al menos un método de notificación (app o email).
          </p>
        )}

        {showSummary && (
          <>
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Recibir resúmenes consolidados
                    <Badge variant="secondary">Recomendado para administradores</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    En lugar de notificaciones individuales, recibe un resumen periódico con todas las alertas
                  </p>
                </div>
                <Switch
                  checked={personalPrefs.receive_summary}
                  onCheckedChange={(checked) => setPersonalPrefs(prev => ({ ...prev, receive_summary: checked }))}
                />
              </div>

              {personalPrefs.receive_summary && (
                <div className="ml-4 space-y-2">
                  <Label>Frecuencia del resumen</Label>
                  <Select
                    value={personalPrefs.summary_frequency}
                    onValueChange={(value) => setPersonalPrefs(prev => ({ ...prev, summary_frequency: value }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}

        <Button onClick={() => saveMutation.mutate(personalPrefs)} disabled={saveMutation.isPending || bothDisabled} className="mt-4">
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar preferencias
        </Button>
      </CardContent>
    </Card>
  );
}
