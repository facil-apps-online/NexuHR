import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { PenTool, ClipboardList, DollarSign, Award, GraduationCap, ClipboardCheck, Stethoscope, BookOpen } from 'lucide-react';

export default function PortalDashboard() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data } = useQuery({
    queryKey: ['portal-dashboard-counts', eid],
    enabled: !!eid,
    queryFn: async () => {
      const [signDot, signEvt, cursos, evals, exams, lastPayroll, regs, acks] = await Promise.all([
        portalSupabase.from('dotacion').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).is('signature_url', null),
        portalSupabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).eq('signed', false),
        portalSupabase.from('courses').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).in('status', ['pendiente', 'en_progreso']),
        portalSupabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('evaluator_id', eid!).neq('status', 'completada'),
        portalSupabase.from('exams').select('id, exam_date, expiry_date').eq('employee_id', eid!).order('exam_date', { ascending: false }).limit(1).maybeSingle(),
        portalSupabase.from('payroll_records').select('payment_date, net_pay').eq('employee_id', eid!).order('payment_date', { ascending: false }).limit(1).maybeSingle(),
        portalSupabase.from('regulations').select('id').eq('status', 'vigente'),
        portalSupabase.from('regulation_acknowledgments').select('regulation_id').eq('employee_id', eid!).eq('status', 'firmado'),
      ]);
      const ackedIds = new Set((acks.data || []).map((a: any) => a.regulation_id));
      const pendingRegs = (regs.data || []).filter((r: any) => !ackedIds.has(r.id)).length;
      return {
        pendingSign: (signDot.count ?? 0) + (signEvt.count ?? 0),
        cursos: cursos.count ?? 0,
        evals: evals.count ?? 0,
        pendingRegs,
        lastExam: exams.data,
        lastPayroll: lastPayroll.data,
      };
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Hola, {employee?.first_name} 👋</h1>
      <p className="text-muted-foreground">Aquí ves todo lo tuyo en un solo lugar.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashCard to="/Funcionarios/pendientes/firmar" icon={PenTool} label="Por firmar" value={data?.pendingSign ?? '—'} />
        <DashCard to="/Funcionarios/pendientes/hacer" icon={ClipboardList} label="Por hacer" value={(data ? data.cursos + data.evals + data.pendingRegs : '—')} />
        <DashCard to="/Funcionarios/cursos" icon={GraduationCap} label="Cursos activos" value={data?.cursos ?? '—'} />
        <DashCard to="/Funcionarios/evaluaciones" icon={ClipboardCheck} label="Evaluaciones por responder" value={data?.evals ?? '—'} />
        <DashCard to="/Funcionarios/examenes" icon={Stethoscope} label="Último examen" value={data?.lastExam?.exam_date ?? 'Sin registros'} />
        <DashCard to="/Funcionarios/desprendibles" icon={DollarSign} label="Último desprendible" value={data?.lastPayroll?.payment_date ?? 'Sin registros'} />
        <DashCard to="/Funcionarios/reglamento" icon={BookOpen} label="Reglamentos por leer" value={data?.pendingRegs ?? '—'} />
        <DashCard to="/Funcionarios/certificados" icon={Award} label="Certificados" value="Generar" />
      </div>
    </EmployeePortalLayout>
  );
}

function DashCard({ to, icon: Icon, label, value }: { to: string; icon: any; label: string; value: any }) {
  return (
    <Link to={to}>
      <Card className="p-5 hover:shadow-md transition flex items-center gap-4 h-full">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold truncate">{String(value)}</p>
        </div>
      </Card>
    </Link>
  );
}
