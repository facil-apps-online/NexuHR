import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export function ReadOnlyBanner() {
  const { currentAssignment } = useAuth();

  const isAdmin = currentAssignment?.role_name === "tenant_super_admin" || currentAssignment?.role_name === "tenant_admin";

  return (
    <div className="bg-yellow-500 border-b border-yellow-600 text-yellow-900 p-3 text-center text-sm flex items-center justify-center gap-3 flex-wrap">
      {isAdmin ? (
        <>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">Tu suscripción requiere atención.</span> Para reactivar todas las funcionalidades, actualiza tu plan.
          </div>
          <Button asChild size="sm" className="bg-yellow-800 hover:bg-yellow-900 text-white">
            <Link to="/suscripcion">Renovar Suscripción</Link>
          </Button>
        </>
      ) : (
        <>
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">Sistema restringido.</span> Comunícate con tu administrador para reactivar el servicio.
          </div>
        </>
      )}
    </div>
  );
}
