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

export default function PortalDotacion() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const qc = useQueryClient();
  const [signing, setSigning] = useState<{ id: string } | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-dotacion', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('dotacion')
        .select('id, item_name, item_type, quantity, size, delivery_date, expiry_date, signature_url, observations')
        .eq('employee_id', eid!)
        .order('delivery_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mi dotación</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes dotación registrada.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((d: any) => (
            <Card key={d.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{d.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.item_type} · Cant. {d.quantity ?? 1}{d.size && ` · Talla ${d.size}`}
                  </p>
                  <p className="text-sm">Entregado: {d.delivery_date ?? 's/f'}{d.expiry_date && ` · Vence: ${d.expiry_date}`}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {d.signature_url ? (
                    <Badge variant="default">Firmado</Badge>
                  ) : (
                    <>
                      <Badge variant="secondary">Pendiente firma</Badge>
                      <Button size="sm" onClick={() => setSigning({ id: d.id })}>
                        <PenTool className="h-4 w-4 mr-2" /> Firmar entrega
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
          module="dotacion"
          recordId={signing.id}
          updateTarget={{ table: 'dotacion', column: 'signature_url' }}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['portal-dotacion', eid] })}
        />
      )}
    </EmployeePortalLayout>
  );
}
