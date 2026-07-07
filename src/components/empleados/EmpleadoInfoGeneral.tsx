import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  AlertCircle,
  FileText
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface EmpleadoInfoGeneralProps {
  employee: Tables<"employees">;
}

export function EmpleadoInfoGeneral({ employee }: EmpleadoInfoGeneralProps) {

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Datos Personales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de documento</p>
              <p className="font-medium">{employee.document_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Número de documento</p>
              <p className="font-medium">{employee.document_number}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{employee.first_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Apellido</p>
              <p className="font-medium">{employee.last_name}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de nacimiento</p>
            <p className="font-medium">{formatDate(employee.birth_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            {employee.active ? (
              <Badge className="bg-success/10 text-success border-success/20">Activo</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Información de Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Correo electrónico</p>
              <p className="font-medium">{employee.email || "No especificado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{employee.phone || "No especificado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Dirección</p>
              <p className="font-medium">{employee.address || "No especificada"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Ciudad</p>
              <p className="font-medium">{employee.city || "No especificada"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Laboral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Información Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cargo</p>
              <p className="font-medium">{employee.position || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Área/Departamento</p>
              <p className="font-medium">{employee.department || "No especificado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Fecha de ingreso</p>
              <p className="font-medium">{formatDate(employee.hire_date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto de Emergencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-primary" />
            Contacto de Emergencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Nombre del contacto</p>
            <p className="font-medium">{employee.emergency_contact || "No especificado"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Teléfono de emergencia</p>
              <p className="font-medium">{employee.emergency_phone || "No especificado"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
