import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ClipboardCheck, CalendarDays, BookOpen, ArrowRight } from 'lucide-react';

export default function PortalPendientesHacer() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data } = useQuery({
    queryKey: ['portal-pending-do', eid],
    enabled: !!eid,
    queryFn: async () => {
      const [cursos, evals, eventos, regs, acks] = await Promise.all([
        portalSupabase.from('courses').select('id, course_name, status', { count: 'exact' }).eq('employee_id', eid!).in('status', ['pendiente', 'en_progreso']),
        portalSupabase.from('evaluations').select('id, period', { count: 'exact' }).eq('evaluator_id', eid!).neq('status', 'completada'),
        portalSupabase.from('event_participants').select('id, events(title, event_date)').eq('employee_id', eid!).eq('signed', false),
        portalSupabase.from('regulations').select('id, title, version').eq('status', 'vigente'),
        portalSupabase.from('regulation_acknowledgments').select('regulation_id').eq('employee_id', eid!).eq('status', 'firmado'),
      ]);
      const ackedIds = new Set((acks.data || []).map((a: any) => a.regulation_id));
      const pendingRegs = (regs.data || []).filter((r: any) => !ackedIds.has(r.id));
      return {
        cursos: cursos.data || [], evals: evals.data || [], eventos: eventos.data || [], regs: pendingRegs,
      };
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Pendientes por hacer</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PendCard to="/Funcionarios/cursos" icon={GraduationCap} label="Cursos en curso" items={data?.cursos.map((c: any) => c.course_name)} />
        <PendCard to="/Funcionarios/evaluaciones" icon={ClipboardCheck} label="Evaluaciones por responder" items={data?.evals.map((e: any) => e.period || 'Evaluación')} />
        <PendCard to="/Funcionarios/eventos" icon={CalendarDays} label="Eventos por confirmar" items={data?.eventos.map((p: any) => p.events?.title)} />
        <PendCard to="/Funcionarios/reglamento" icon={BookOpen} label="Reglamentos por leer" items={data?.regs.map((r: any) => r.title)} />
      </div>
    </EmployeePortalLayout>
  );
}

function PendCard({ to, icon: Icon, label, items }: any) {
  const count = items?.length ?? 0;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Icon className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">{count} pendiente{count === 1 ? '' : 's'}</p>
        </div>
      </div>
      {count > 0 && (
        <ul className="text-sm pl-3 space-y-1 max-h-24 overflow-y-auto">
          {items.slice(0, 5).map((t: string, i: number) => <li key={i} className="list-disc list-inside truncate">{t || '—'}</li>)}
        </ul>
      )}
      <Button asChild size="sm" variant="ghost" className="w-full justify-between">
        <Link to={to}>Ver detalle <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </Card>
  );
}
