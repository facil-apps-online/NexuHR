import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { coreSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Suscripcion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentAssignment } = useAuth();
  const paymentStatus = searchParams.get("payment_status");
  const [paymentProcessing, setPaymentProcessing] = useState(paymentStatus === "success");

  useEffect(() => {
    if (paymentStatus === "success" && currentAssignment?.tenant_id) {
      const processPayment = async () => {
        try {
          await coreSupabase.functions.invoke("core-actions", {
            body: {
              action: "activate_subscription",
              payload: {
                tenantId: currentAssignment.tenant_id,
                planId: searchParams.get("plan_id") || undefined,
              },
            },
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          window.location.reload();
        } catch (err) {
          console.error("Error activating subscription:", err);
          setPaymentProcessing(false);
        }
      };
      processPayment();
    }
  }, [paymentStatus, currentAssignment?.tenant_id, searchParams]);

  if (paymentProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
            </div>
            <CardTitle className="mt-4">Procesando tu pago...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Estamos verificando tu pago y reactivando tu suscripción. Esto tomará solo unos segundos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Panel
          </Button>
          <h1 className="text-2xl font-bold">Suscripción</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona tu plan para restaurar el acceso completo a la plataforma.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
