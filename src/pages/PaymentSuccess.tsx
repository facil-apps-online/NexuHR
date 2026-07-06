import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { coreSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { currentAssignment } = useAuth();
  const planId = searchParams.get("plan_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const activateSubscription = async () => {
      if (!currentAssignment?.tenant_id) return;

      try {
        const { error } = await coreSupabase.functions.invoke("core-actions", {
          body: {
            action: "activate_subscription",
            payload: { tenantId: currentAssignment.tenant_id, planId: planId || undefined },
          },
        });

        if (error) throw new Error(error.message);
        setStatus("success");
      } catch (err: any) {
        setErrorMessage(err.message || "Error al activar la suscripción.");
        setStatus("error");
      }
    };

    activateSubscription();
  }, [currentAssignment?.tenant_id, planId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Activando tu suscripción...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-red-100 rounded-full h-16 w-16 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="mt-4">Error en la Activación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Link to="/suscripcion" className="text-primary hover:underline">
              Volver a Suscripción
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4">¡Pago Exitoso!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Tu suscripción ha sido reactivada. Ya puedes disfrutar de todas las funcionalidades.
          </p>
          <Link to="/dashboard" className="text-primary hover:underline font-medium">
            Ir al Panel Principal
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
