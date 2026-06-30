import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { History, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const labelByAction: Record<string, string> = {
  login: 'Inicio de sesión',
  firmo_documento: 'Firmó un documento',
  descargo_certificado: 'Descargó un certificado',
  descargo_desprendible: 'Descargó un desprendible',
  cambio_password: 'Cambió su contraseña',
  cargo_evidencia: 'Cargó un soporte',
  reporto_incapacidad: 'Reportó una incapacidad',
  actualizo_perfil: 'Actualizó su perfil',
  respondio_evaluacion: 'Respondió una evaluación',
};

export default function PortalHistorial() {
  const { employee } = useEmployeePortalAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-activity', employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await portalSupabase
        .from('employee_activity_log' as any)
        .select('*')
        .eq('employee_id', employee!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <EmployeePortalLayout>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" /> Mi historial
        </h1>
        <p className="text-muted-foreground text-sm">Actividad reciente en tu portal.</p>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
      ) : data.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no hay actividad registrada</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {data.map((a: any) => (
                <li key={a.id} className="p-4">
                  <p className="font-medium">{labelByAction[a.action] ?? a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </EmployeePortalLayout>
  );
}
