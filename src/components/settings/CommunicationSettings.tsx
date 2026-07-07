import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { EmailConfigurationSettings } from "@/components/settings/EmailConfigurationSettings";
import { EmailTemplatesSettings } from "@/components/settings/EmailTemplatesSettings";
import { Bell, Mail } from "lucide-react";

export function CommunicationSettings() {
  return (
    <Tabs defaultValue="alertas" className="space-y-6">
      <TabsList>
        <TabsTrigger value="alertas" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertas
        </TabsTrigger>
        <TabsTrigger value="correo" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Correo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="alertas">
        <AlertSettings />
      </TabsContent>

      <TabsContent value="correo" className="space-y-6">
        <EmailConfigurationSettings />
        <EmailTemplatesSettings />
      </TabsContent>
    </Tabs>
  );
}
