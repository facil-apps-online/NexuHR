import {
  Wrench, UserPlus, CalendarPlus, GraduationCap, FileSignature, Shirt,
  ClipboardCheck, Target, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const actions = [
  { label: "Nuevo Empleado", icon: UserPlus, href: "/empleados", color: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  { label: "Programar Examen", icon: CalendarPlus, href: "/examenes", color: "bg-success hover:bg-success/90 text-success-foreground" },
  { label: "Registrar Curso", icon: GraduationCap, href: "/cursos", color: "bg-info hover:bg-info/90 text-info-foreground" },
  { label: "Crear Evento", icon: FileSignature, href: "/eventos", color: "bg-secondary hover:bg-secondary/90 text-secondary-foreground" },
  { label: "Registrar Dotación", icon: Shirt, href: "/dotacion", color: "bg-warning hover:bg-warning/90 text-warning-foreground" },
  { label: "Nueva Evaluación", icon: ClipboardCheck, href: "/evaluaciones-desempeno", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Eval. Competencias", icon: Target, href: "/evaluaciones-competencias", color: "bg-cyan-600 hover:bg-cyan-700 text-white" },
  { label: "Enviar Comunicado", icon: Mail, href: "/comunicaciones", color: "bg-rose-600 hover:bg-rose-700 text-white" },
];

export function FabToolbox() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/40"
        >
          <Wrench className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={16}
        className="w-72 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Acciones Rápidas</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className={`flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center text-xs font-medium transition-colors ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              <span className="leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
