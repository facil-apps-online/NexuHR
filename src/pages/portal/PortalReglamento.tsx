import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PortalSignatureDialog } from '@/components/portal/PortalSignatureDialog';
import { PortalRecordAttachments } from '@/components/portal/PortalRecordAttachments';

export default function PortalReglamento() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const qc = useQueryClient();

  const { data: regs } = useQuery({
    queryKey: ['portal-regulations', employee?.tenant_id],
    enabled: !!employee,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('regulations')
        .select('*')
        .eq('status', 'publicado')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: acks } = useQuery({
    queryKey: ['portal-acks', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase.from('regulation_acknowledgments').select('id, regulation_id, acknowledged_at, status, signature_url').eq('employee_id', eid!);
      return data || [];
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Reglamento Interno</h1>
      <div className="space-y-3">
        {regs?.map((r: any) => {
          const ack = acks?.find((a) => a.regulation_id === r.id);
          return <RegItem key={r.id} reg={r} ack={ack} onAck={() => qc.invalidateQueries({ queryKey: ['portal-acks', eid] })} employeeId={eid!} tenantId={employee!.tenant_id} />;
        })}
        {regs?.length === 0 && <p className="text-muted-foreground">No hay reglamentos publicados.</p>}
      </div>
    </EmployeePortalLayout>
  );
}

function RegItem({ reg, ack, onAck, employeeId, tenantId }: any) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [ackId, setAckId] = useState<string | null>(ack?.id || null);
  const ref = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolled(true);
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const el = ref.current;
        if (el && el.scrollHeight <= el.clientHeight) {
          setScrolled(true);
        }
      }, 100);
    }
  }, [open]);

  const handleAck = async () => {
    setBusy(true);
    try {
      let currentAckId = ack?.id || ackId;
      if (!currentAckId) {
        const { data, error } = await portalSupabase.from('regulation_acknowledgments').insert({
          regulation_id: reg.id, employee_id: employeeId, tenant_id: tenantId,
          status: 'pendiente',
        }).select('id').single();
        if (error) throw error;
        currentAckId = data.id;
        setAckId(data.id);
      }

      if (reg.requires_signature !== false) {
        setSignOpen(true);
      } else {
        const { error } = await portalSupabase.from('regulation_acknowledgments').update({
          acknowledged_at: new Date().toISOString(), status: 'firmado',
        }).eq('id', currentAckId);
        if (error) throw error;
        toast.success('Reglamento marcado como leído');
        onAck();
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message || 'No fue posible registrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{reg.title} <span className="text-sm text-muted-foreground">v{reg.version}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {ack?.acknowledged_at && (
            <span className="text-sm text-green-600 font-medium">✓ Leído el {new Date(ack.acknowledged_at).toLocaleDateString()}</span>
          )}
          {(!ack?.acknowledged_at || (reg.requires_signature !== false && !ack?.signature_url)) && (
            <Button 
              size="sm" 
              variant={ack?.acknowledged_at ? 'destructive' : 'default'} 
              onClick={() => {
                if (ack?.acknowledged_at && !ack?.signature_url) {
                  setSignOpen(true);
                } else {
                  setOpen((o) => !o);
                }
              }}
            >
              {ack?.acknowledged_at && !ack?.signature_url ? 'Pendiente firma' : (open ? 'Cerrar' : 'Leer')}
            </Button>
          )}
        </div>
      </div>
      {ack?.id && <PortalRecordAttachments module="reglamento" recordId={ack.id} />}
      {open && (
        <div>
          <div ref={ref} onScroll={handleScroll} className="max-h-72 overflow-y-auto border rounded p-3 text-sm whitespace-pre-wrap">
            {reg.content_type === 'pdf' ? (
              <div className="text-center p-4">
                <p className="mb-2">Este reglamento es un documento PDF.</p>
                {reg.document_url && (
                  <a href={reg.document_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    Descargar / Ver PDF
                  </a>
                )}
              </div>
            ) : (
              reg.content_text || 'Sin contenido.'
            )}
          </div>
          <Button className="mt-3 w-full" disabled={!scrolled || busy} onClick={handleAck}>
            {scrolled ? (reg.requires_signature !== false ? 'Firmar y Marcar como leído' : 'Marcar como leído') : 'Desplaza hasta el final para habilitar'}
          </Button>
        </div>
      )}

      { (ack?.id || ackId) && signOpen && (
        <PortalSignatureDialog
          open={signOpen}
          onOpenChange={setSignOpen}
          module="reglamento"
          recordId={(ack?.id || ackId) as string}
          updateTarget={{
            table: 'regulation_acknowledgments',
            column: 'signature_url',
            extra: { status: 'firmado', acknowledged_at: new Date().toISOString() },
          }}
          onSuccess={() => {
            onAck();
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}
