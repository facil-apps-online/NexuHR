import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { CommunicationSettings } from "@/components/settings/CommunicationSettings";
import { MasterDataSettings } from "@/components/settings/MasterDataSettings";
import { SignatureSettings } from "@/components/settings/SignatureSettings";
import { AnnualParametersSettings } from "@/components/settings/AnnualParametersSettings";
import { PortalAccountsSettings } from "@/components/settings/PortalAccountsSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import {
  Building2,
  Bell,
  Shield,
  Database,
  PenTool,
  DollarSign,
  IdCard,
  CreditCard,
} from "lucide-react";

export default function Configuracion() {
  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="mt-1 text-muted-foreground">
            Personaliza la configuración de tu organización
          </p>
        </div>

        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="flex w-full flex-wrap h-auto">
            <TabsTrigger value="empresa" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="maestros" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Maestros</span>
            </TabsTrigger>
            <TabsTrigger value="firmas" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">Firmas</span>
            </TabsTrigger>

            <TabsTrigger value="comunicaciones" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Comunicaciones</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="parametros" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Parámetros</span>
            </TabsTrigger>
            <TabsTrigger value="portal" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <IdCard className="h-4 w-4" />
              <span className="hidden sm:inline">Portal Empleado</span>
            </TabsTrigger>
            <TabsTrigger value="suscripcion" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Suscripción</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="maestros">
            <MasterDataSettings />
          </TabsContent>

          <TabsContent value="firmas">
            <SignatureSettings />
          </TabsContent>

          <TabsContent value="comunicaciones">
            <CommunicationSettings />
          </TabsContent>

          <TabsContent value="seguridad">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="parametros">
            <AnnualParametersSettings />
          </TabsContent>

          <TabsContent value="portal">
            <PortalAccountsSettings />
          </TabsContent>

          <TabsContent value="suscripcion">
            <SubscriptionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}