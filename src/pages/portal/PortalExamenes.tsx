import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function PortalExamenes() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-examenes', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('exams')
        .select('id, exam_type, exam_date, scheduled_date, expiry_date, result, status, entity, document_url, observations')
        .eq('employee_id', eid!)
        .order('exam_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  const download = async (path: string) => {
    const { data } = await portalSupabase.storage.from('exam-documents').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis exámenes médicos</h1>
      <p className="text-sm text-muted-foreground">Tu información médica es confidencial. Solo tú puedes verla.</p>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes exámenes registrados.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((x: any) => (
            <Card key={x.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{x.exam_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {x.exam_date ? `Realizado: ${x.exam_date}` : x.scheduled_date ? `Programado: ${x.scheduled_date}` : '—'}
                    {x.entity && <> · {x.entity}</>}
                  </p>
                  {x.result && <p className="text-sm mt-1">Resultado: <span className="font-medium">{x.result}</span></p>}
                  {x.expiry_date && <p className="text-sm text-muted-foreground">Vence: {x.expiry_date}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary">{x.status || '—'}</Badge>
                  {x.document_url && (
                    <Button size="sm" variant="outline" onClick={() => download(x.document_url)}>
                      <Download className="h-4 w-4 mr-2" /> Descargar
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
