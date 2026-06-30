import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function PortalCursos() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-cursos', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('courses')
        .select('id, course_name, provider, start_date, end_date, expiry_date, status, certificate_url, grade')
        .eq('employee_id', eid!)
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const downloadCert = async (path: string) => {
    const { data } = await portalSupabase.storage.from('evidences').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis cursos y certificaciones</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes cursos registrados.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((c: any) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.course_name}</p>
                  <p className="text-sm text-muted-foreground">{c.provider || 'Sin proveedor'}</p>
                  <p className="text-sm mt-1">
                    {c.start_date ?? '—'} → {c.end_date ?? '—'}
                    {c.expiry_date && <span className="ml-3 text-muted-foreground">Vence: {c.expiry_date}</span>}
                  </p>
                  {c.grade != null && <p className="text-sm mt-1">Calificación: <span className="font-medium">{c.grade}</span></p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusVariant(c.status)}>{labelStatus(c.status)}</Badge>
                  {c.certificate_url && (
                    <Button size="sm" variant="outline" onClick={() => downloadCert(c.certificate_url)}>
                      <Download className="h-4 w-4 mr-2" /> Certificado
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}

function labelStatus(s: string) {
  return ({ pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado', vencido: 'Vencido', cancelado: 'Cancelado' } as any)[s] || s || '—';
}
function statusVariant(s: string): any {
  if (s === 'completado') return 'default';
  if (s === 'vencido' || s === 'cancelado') return 'destructive';
  return 'secondary';
}
