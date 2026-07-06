import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PaymentFailure() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 rounded-full h-16 w-16 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="mt-4">Pago Fallido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Hubo un problema al procesar tu pago. Por favor, inténtalo de nuevo o contacta a soporte.
          </p>
          <Link to="/suscripcion" className="text-primary hover:underline font-medium">
            Volver a intentar
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
