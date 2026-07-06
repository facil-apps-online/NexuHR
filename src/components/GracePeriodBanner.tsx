import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";

export function GracePeriodBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-orange-500 border-b border-orange-600 text-white p-3 text-center text-sm flex items-center justify-center gap-3 flex-wrap relative">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div>
        <span className="font-semibold">Tu suscripción ha vencido.</span> Tienes 3 días de gracia antes de que se restrinja el acceso.
      </div>
      <Button asChild size="sm" className="bg-orange-700 hover:bg-orange-800 text-white">
        <Link to="/suscripcion">Renovar Ahora</Link>
      </Button>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20"
        aria-label="Cerrar banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
