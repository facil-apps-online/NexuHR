import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shirt, CalendarDays, ArrowRight } from 'lucide-react';

export default function PortalPendientesFirmar() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-pending-sign', eid],
    enabled: !!eid,
    queryFn: async () => {
      const [dot, evt] = await Promise.all([
        portalSupabase.from('dotacion').select('id, item_name, delivery_date').eq('employee_id', eid!).is('signature_url', null),
        portalSupabase.from('event_participants').select('id, events(title, event_date)').eq('employee_id', eid!).eq('signed', false),
      ]);
      return { dotacion: dot.data || [], eventos: evt.data || [] };
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Pendientes por firmar</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : (
        <div className="space-y-6">
          <Section title="Dotación" icon={Shirt} to="/Funcionarios/dotacion">
            {data?.dotacion.length === 0 ? <Empty /> : data?.dotacion.map((d: any) => (
              <Item key={d.id} title={d.item_name} subtitle={`Entregado: ${d.delivery_date ?? 's/f'}`} />
            ))}
          </Section>
          <Section title="Eventos / Capacitaciones" icon={CalendarDays} to="/Funcionarios/eventos">
            {data?.eventos.length === 0 ? <Empty /> : data?.eventos.map((e: any) => (
              <Item key={e.id} title={e.events?.title || 'Evento'} subtitle={`Fecha: ${e.events?.event_date ?? 's/f'}`} />
            ))}
          </Section>
        </div>
      )}
    </EmployeePortalLayout>
  );
}

function Section({ title, icon: Icon, to, children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Icon className="h-5 w-5" /> {title}</h2>
        <Button asChild size="sm" variant="ghost"><Link to={to}>Firmar <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Item({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{subtitle}</p></div>
      <Badge variant="secondary">Pendiente</Badge>
    </Card>
  );
}
function Empty() { return <p className="text-sm text-muted-foreground">No hay pendientes 🎉</p>; }
