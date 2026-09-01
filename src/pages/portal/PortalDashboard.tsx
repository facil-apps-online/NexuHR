import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { usePortalSlug } from '@/hooks/usePortalSlug';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PenTool, ClipboardList, DollarSign, Award, GraduationCap, ClipboardCheck,
  Stethoscope, BookOpen, Shirt, HeartPulse, ShieldAlert, AlertTriangle, Clock,
} from 'lucide-react';

export default function PortalDashboard() {
  const { employee } = useEmployeePortalAuth();
  const { basePath } = usePortalSlug();
  const eid = employee?.id;

  const { data } = useQuery({
    queryKey: ['portal-dashboard-counts', eid],
    enabled: !!eid,
    queryFn: async () => {
      const [signDot, signEvt, cursos, evals, exams, lastPayroll, regs, acks, dotacion, incapacidades, vigilancias] = await Promise.all([
        portalSupabase.from('dotacion').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).is('signature_url', null),
        portalSupabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).eq('signed', false),
        portalSupabase.from('courses').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).in('status', ['pendiente', 'en_progreso']),
        portalSupabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('evaluator_id', eid!).neq('status', 'completada'),
        portalSupabase.from('exams').select('id, exam_date, expiry_date').eq('employee_id', eid!).order('exam_date', { ascending: false }).limit(1).maybeSingle(),
        portalSupabase.from('payroll_records').select('payment_date, net_pay').eq('employee_id', eid!).order('payment_date', { ascending: false }).limit(1).maybeSingle(),
        portalSupabase.from('regulations').select('id').eq('status', 'vigente'),
        portalSupabase.from('regulation_acknowledgments').select('regulation_id').eq('employee_id', eid!).eq('status', 'firmado'),
        portalSupabase.from('dotacion').select('id', { count: 'exact', head: true }).eq('employee_id', eid!),
        portalSupabase.from('incapacidades' as any).select('id', { count: 'exact', head: true }).eq('employee_id', eid!).eq('estado', 'registrada'),
        portalSupabase.from('vigilancias').select('id', { count: 'exact', head: true }).eq('employee_id', eid!).eq('status', 'activa'),
      ]);
      const ackedIds = new Set((acks.data || []).map((a: any) => a.regulation_id));
      const pendingRegs = (regs.data || []).filter((r: any) => !ackedIds.has(r.id)).length;

      const examExpiry = exams.data?.expiry_date;
      const examExpired = examExpiry ? new Date(examExpiry) < new Date() : false;

      return {
        pendingSign: (signDot.count ?? 0) + (signEvt.count ?? 0),
        cursos: cursos.count ?? 0,
        evals: evals.count ?? 0,
        pendingRegs,
        lastExam: exams.data,
        lastPayroll: lastPayroll.data,
        dotacionTotal: dotacion.count ?? 0,
        incapacidadesPendientes: incapacidades.count ?? 0,
        vigilanciasActivas: vigilancias.count ?? 0,
        examExpired,
      };
    },
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <EmployeePortalLayout>
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}, {employee?.first_name} 👋</h1>
        <p className="text-muted-foreground">Aquí ves todo lo tuyo en un solo lugar.</p>
      </div>

      {/* Alertas */}
      {data?.examExpired && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm">Tu examen médico ha vencido. Solicita uno nuevo.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard to={`${basePath}/pendientes/firmar`} icon={PenTool} label="Por firmar" value={data?.pendingSign ?? '—'} alert={!!data?.pendingSign && data.pendingSign > 0} />
        <DashCard to={`${basePath}/pendientes/hacer`} icon={ClipboardList} label="Por hacer" value={(data ? data.cursos + data.evals + data.pendingRegs : '—')} alert={data ? (data.cursos + data.evals + data.pendingRegs) > 0 : false} />
        <DashCard to={`${basePath}/cursos`} icon={GraduationCap} label="Cursos activos" value={data?.cursos ?? '—'} />
        <DashCard to={`${basePath}/evaluaciones`} icon={ClipboardCheck} label="Evals. pendientes" value={data?.evals ?? '—'} alert={!!data?.evals && data.evals > 0} />
      </div>

      {/* Stats secundarias */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard to={`${basePath}/dotacion`} icon={Shirt} label="Dotación total" value={data?.dotacionTotal ?? '—'} />
        <DashCard to={`${basePath}/examenes`} icon={Stethoscope} label="Último examen" value={data?.lastExam?.exam_date ?? 'Sin registros'} alert={data?.examExpired} />
        <DashCard to={`${basePath}/desprendibles`} icon={DollarSign} label="Último desprendible" value={data?.lastPayroll?.payment_date ?? 'Sin registros'} />
        <DashCard to={`${basePath}/incapacidades`} icon={HeartPulse} label="Incap. pendientes" value={data?.incapacidadesPendientes ?? '—'} alert={!!data?.incapacidadesPendientes && data.incapacidadesPendientes > 0} />
      </div>

      {/* Stats terciarias */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard to={`${basePath}/reglamento`} icon={BookOpen} label="Reglamentos por leer" value={data?.pendingRegs ?? '—'} alert={!!data?.pendingRegs && data.pendingRegs > 0} />
        <DashCard to={`${basePath}/certificados`} icon={Award} label="Certificados" value="Generar" />
        <DashCard to={`${basePath}/vigilancias`} icon={ShieldAlert} label="Vigilancias activas" value={data?.vigilanciasActivas ?? '—'} />
      </div>
    </EmployeePortalLayout>
  );
}

function DashCard({ to, icon: Icon, label, value, alert }: { to: string; icon: any; label: string; value: any; alert?: boolean }) {
  return (
    <Link to={to}>
      <Card className={`p-5 hover:shadow-md transition flex items-center gap-4 h-full ${alert ? 'border-l-4 border-l-primary' : ''}`}>
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
