import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PortalVigilancias() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-vigilancias', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('vigilancias')
        .select('id, vigilancia_type, diagnosis, start_date, end_date, follow_up_date, recommendations, restrictions, status')
        .eq('employee_id', eid!)
        .order('start_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Vigilancia epidemiológica</h1>
      <p className="text-sm text-muted-foreground">Seguimiento de salud ocupacional. Información confidencial.</p>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No estás en programas de vigilancia.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((v: any) => (
            <Card key={v.id} className="p-4 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{v.vigilancia_type}</p>
                <Badge variant="secondary">{v.status || '—'}</Badge>
              </div>
              {v.diagnosis && <p className="text-sm">Diagnóstico: {v.diagnosis}</p>}
              <p className="text-sm text-muted-foreground">
                Inicio: {v.start_date ?? '—'}{v.end_date && ` · Fin: ${v.end_date}`}
              </p>
              {v.follow_up_date && <p className="text-sm">Próximo seguimiento: <span className="font-medium">{v.follow_up_date}</span></p>}
              {v.recommendations && <p className="text-sm mt-1"><span className="text-muted-foreground">Recomendaciones:</span> {v.recommendations}</p>}
              {v.restrictions && <p className="text-sm"><span className="text-muted-foreground">Restricciones:</span> {v.restrictions}</p>}
            </Card>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}
