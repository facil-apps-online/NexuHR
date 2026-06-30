import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PortalSignatureDialog } from '@/components/portal/PortalSignatureDialog';
import { PenTool } from 'lucide-react';

export default function PortalEventos() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const qc = useQueryClient();
  const [signing, setSigning] = useState<{ id: string } | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-eventos', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('event_participants')
        .select('id, signed, signed_at, signature_url, events(id, title, event_type, event_date, location, description, status)')
        .eq('employee_id', eid!)
        .order('invited_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis eventos y capacitaciones</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No estás inscrito en eventos.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.events?.title || 'Evento'}</p>
                  <p className="text-sm text-muted-foreground">{p.events?.event_type} · {p.events?.event_date}</p>
                  {p.events?.location && <p className="text-sm">📍 {p.events.location}</p>}
                  {p.events?.description && <p className="text-sm mt-1 text-muted-foreground line-clamp-2">{p.events.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.signed ? (
                    <Badge variant="default">Firmado</Badge>
                  ) : (
                    <>
                      <Badge variant="secondary">Pendiente firma</Badge>
                      <Button size="sm" onClick={() => setSigning({ id: p.id })}>
                        <PenTool className="h-4 w-4 mr-2" /> Firmar asistencia
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {signing && (
        <PortalSignatureDialog
          open
          onOpenChange={(o) => !o && setSigning(null)}
          module="eventos"
          recordId={signing.id}
          updateTarget={{ table: 'event_participants', column: 'signature_url', extra: { signed: true, signed_at: new Date().toISOString() } }}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['portal-eventos', eid] })}
        />
      )}
    </EmployeePortalLayout>
  );
}
