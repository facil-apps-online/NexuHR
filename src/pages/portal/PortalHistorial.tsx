import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, User, Shield } from 'lucide-react';
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
  admin_subio_documento: 'Tu empresa subió un documento para ti',
  admin_genero_certificado: 'Tu empresa generó un certificado',
  admin_asigno_curso: 'Tu empresa te asignó un curso',
  admin_programo_examen: 'Tu empresa programó un examen',
  admin_registro_incapacidad: 'Tu empresa registró una incapacidad',
};

interface ActivityItem {
  id: string;
  action: string;
  description?: string;
  source: 'employee' | 'admin';
  created_at: string;
}

export default function PortalHistorial() {
  const { employee } = useEmployeePortalAuth();

  const { data: employeeActions = [], isLoading: loading1 } = useQuery({
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
      return (data || []).map((a: any) => ({
        ...a,
        source: 'employee' as const,
      })) as ActivityItem[];
    },
  });

  const { data: adminActions = [], isLoading: loading2 } = useQuery({
    queryKey: ['portal-admin-activity', employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      if (!employee) return [];

      const items: ActivityItem[] = [];

      const { data: evidences } = await portalSupabase
        .from('evidences')
        .select('id, module, file_name, created_at, uploaded_by')
        .eq('employee_id', employee.id)
        .not('uploaded_by', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      (evidences || []).forEach((e: any) => {
        items.push({
          id: `admin-ev-${e.id}`,
          action: 'admin_subio_documento',
          description: `${e.file_name} (${e.module})`,
          source: 'admin',
          created_at: e.created_at,
        });
      });

      const { data: courses } = await portalSupabase
        .from('courses')
        .select('id, course_name, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(20);

      (courses || []).forEach((c: any) => {
        items.push({
          id: `admin-course-${c.id}`,
          action: 'admin_asigno_curso',
          description: c.course_name,
          source: 'admin',
          created_at: c.created_at,
        });
      });

      const { data: exams } = await portalSupabase
        .from('exams')
        .select('id, exam_type, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(20);

      (exams || []).forEach((e: any) => {
        items.push({
          id: `admin-exam-${e.id}`,
          action: 'admin_programo_examen',
          description: e.exam_type,
          source: 'admin',
          created_at: e.created_at,
        });
      });

      return items;
    },
  });

  const allActions = [...employeeActions, ...adminActions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 100);

  const isLoading = loading1 || loading2;

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
      ) : allActions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no hay actividad registrada</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {allActions.map((a) => (
                <li key={a.id} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${a.source === 'admin' ? 'bg-blue-500/10' : 'bg-muted'}`}>
                    {a.source === 'admin'
                      ? <Shield className="h-3.5 w-3.5 text-blue-600" />
                      : <User className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{labelByAction[a.action] ?? a.action}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {a.source === 'admin' ? 'Empresa' : 'Tú'}
                      </Badge>
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </EmployeePortalLayout>
  );
}
