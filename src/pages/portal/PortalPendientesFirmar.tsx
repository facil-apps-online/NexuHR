import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { usePortalSlug } from '@/hooks/usePortalSlug';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shirt, CalendarDays, ArrowRight, BookOpen, Monitor, HeartPulse, Stethoscope, 
  GraduationCap, ShieldCheck, ClipboardCheck
} from 'lucide-react';
import { useMemo } from 'react';

const moduleIcons: Record<string, any> = {
  eventos: CalendarDays,
  dotacion: Shirt,
  evaluaciones: ClipboardCheck,
  reglamento: BookOpen,
  activos_fijos: Monitor,
  incapacidades: HeartPulse,
  examenes: Stethoscope,
  cursos: GraduationCap,
  vigilancias: ShieldCheck,
};

const moduleTitles: Record<string, string> = {
  eventos: "Eventos / Capacitaciones",
  dotacion: "Dotación",
  evaluaciones: "Eval. Desempeño",
  reglamento: "Reglamentos",
  activos_fijos: "Activos Fijos",
  incapacidades: "Incapacidades",
  examenes: "Exámenes Médicos",
  cursos: "Cursos",
  vigilancias: "Vigilancia Epidemiológica",
};

export default function PortalPendientesFirmar() {
  const { employee, account } = useEmployeePortalAuth();
  const { basePath } = usePortalSlug();
  const eid = employee?.id;
  const tenantId = account?.tenant_id;

  // 1. Fetch enabled modules for signatures from tenant_settings
  const { data: enabledModules = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['portal-signature-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('tenant_settings')
        .select('settings_data')
        .eq('tenant_id', tenantId!)
        .eq('setting_key', 'signatures')
        .maybeSingle();
      return ((data?.settings_data as any)?.signature_modules || []) as string[];
    },
  });

  // Helper to fetch all signed records for the employee for a specific module
  const fetchSignedIds = async (moduleCode: string) => {
    if (!tenantId || !eid) return new Set<string>();
    
    const modulesToFetch = moduleCode === 'reglamento' ? ['reglamento', 'reglamentos'] : [moduleCode];

    const { data } = await portalSupabase
      .from('signatures' as any)
      .select('record_id')
      .eq('tenant_id', tenantId)
      .eq('employee_id', eid)
      .in('module', modulesToFetch);
      
    return new Set((data || []).map((s: any) => s.record_id));
  };

  // 2. Fetch data dynamically for each enabled module
  const { data: dotacionData, isLoading: l1 } = useQuery({
    queryKey: ['portal-pending-sign', 'dotacion', eid],
    enabled: !!eid && enabledModules.includes('dotacion'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('dotacion');
      const { data } = await portalSupabase.from('dotacion').select('id, item_name, delivery_date').eq('employee_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: d.item_name, subtitle: `Entregado: ${d.delivery_date ?? 's/f'}`
      }));
    }
  });

  const { data: eventosData, isLoading: l2 } = useQuery({
    queryKey: ['portal-pending-sign', 'eventos', eid],
    enabled: !!eid && enabledModules.includes('eventos'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('eventos');
      const { data } = await portalSupabase.from('event_participants').select('id, events(title, event_date)').eq('employee_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: (d.events as any)?.title || 'Evento', subtitle: `Fecha: ${(d.events as any)?.event_date ?? 's/f'}`
      }));
    }
  });

  const { data: reglamentoData, isLoading: l3 } = useQuery({
    queryKey: ['portal-pending-sign', 'reglamento', eid],
    enabled: !!eid && enabledModules.includes('reglamento'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('reglamento');
      const { data } = await portalSupabase.from('regulation_acknowledgments').select('id, regulations(title, requires_signature)').eq('employee_id', eid!);
      return (data || []).filter(d => (d.regulations as any)?.requires_signature !== false && !signedIds.has(d.id)).map(d => ({
        id: d.id, title: (d.regulations as any)?.title || 'Reglamento', subtitle: 'Pendiente de lectura y firma'
      }));
    }
  });

  const { data: evaluacionesData, isLoading: l4 } = useQuery({
    queryKey: ['portal-pending-sign', 'evaluaciones', eid],
    enabled: !!eid && enabledModules.includes('evaluaciones'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('evaluaciones');
      const { data } = await portalSupabase.from('evaluations' as any).select('id, period, evaluation_date').eq('employee_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: `Evaluación ${d.period}`, subtitle: `Fecha: ${d.evaluation_date ?? 's/f'}`
      }));
    }
  });

  const { data: examenesData, isLoading: l5 } = useQuery({
    queryKey: ['portal-pending-sign', 'examenes', eid],
    enabled: !!eid && enabledModules.includes('examenes'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('examenes');
      const { data } = await portalSupabase.from('exams' as any).select('id, exam_type, exam_date').eq('employee_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: `Examen: ${d.exam_type}`, subtitle: `Fecha: ${d.exam_date ?? 's/f'}`
      }));
    }
  });

  const { data: incapacidadesData, isLoading: l6 } = useQuery({
    queryKey: ['portal-pending-sign', 'incapacidades', eid],
    enabled: !!eid && enabledModules.includes('incapacidades'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('incapacidades');
      const { data } = await portalSupabase.from('incapacidades' as any).select('id, tipo, fecha_inicio').eq('employee_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: `Incapacidad: ${d.tipo}`, subtitle: `Inicio: ${d.fecha_inicio ?? 's/f'}`
      }));
    }
  });

  const { data: activosData, isLoading: l7 } = useQuery({
    queryKey: ['portal-pending-sign', 'activos_fijos', eid],
    enabled: !!eid && enabledModules.includes('activos_fijos'),
    queryFn: async () => {
      const signedIds = await fetchSignedIds('activos_fijos');
      const { data } = await portalSupabase.from('activos_fijos' as any).select('id, modelo, nombre').eq('empleado_asignado_id', eid!);
      return (data || []).filter(d => !signedIds.has(d.id)).map(d => ({
        id: d.id, title: d.nombre || 'Activo Fijo', subtitle: `Modelo: ${d.modelo ?? 's/f'}`
      }));
    }
  });

  const isAnyLoading = loadingSettings || l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const sections = useMemo(() => {
    const list = [];
    if (enabledModules.includes('dotacion')) list.push({ key: 'dotacion', data: dotacionData || [] });
    if (enabledModules.includes('eventos')) list.push({ key: 'eventos', data: eventosData || [] });
    if (enabledModules.includes('reglamento')) list.push({ key: 'reglamento', data: reglamentoData || [] });
    if (enabledModules.includes('evaluaciones')) list.push({ key: 'evaluaciones', data: evaluacionesData || [] });
    if (enabledModules.includes('examenes')) list.push({ key: 'examenes', data: examenesData || [] });
    if (enabledModules.includes('incapacidades')) list.push({ key: 'incapacidades', data: incapacidadesData || [] });
    if (enabledModules.includes('activos_fijos')) list.push({ key: 'activos_fijos', data: activosData || [] });
    return list;
  }, [enabledModules, dotacionData, eventosData, reglamentoData, evaluacionesData, examenesData, incapacidadesData, activosData]);

  return (
    <EmployeePortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pendientes por firmar</h1>
        <p className="text-muted-foreground mt-1">Revisa y firma los documentos requeridos por tu empresa.</p>
      </div>
      
      {isAnyLoading ? <p className="text-muted-foreground">Cargando pendientes...</p> : (
        <div className="space-y-6">
          {sections.length === 0 ? (
            <p className="text-muted-foreground">Tu empresa no tiene módulos de firma habilitados.</p>
          ) : sections.map((section) => (
            <Section 
              key={section.key} 
              title={moduleTitles[section.key]} 
              icon={moduleIcons[section.key] || ArrowRight} 
              to={`${basePath}/${section.key}`}
            >
              {section.data.length === 0 ? <Empty /> : section.data.map((item: any) => (
                <Item key={item.id} title={item.title} subtitle={item.subtitle} />
              ))}
            </Section>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}

function Section({ title, icon: Icon, to, children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" /> 
          {title}
        </h2>
        <Button asChild size="default" variant="ghost">
          <Link to={to}>
            Ver detalles <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="p-4 flex items-center justify-between bg-card hover:bg-accent/10 transition-colors border-l-4 border-l-warning">
      <div>
        <p className="font-medium text-sm md:text-base">{title}</p>
        <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-warning/30">Pendiente</Badge>
    </Card>
  );
}

function Empty() { 
  return <p className="text-sm text-muted-foreground italic px-4 py-2 bg-muted/30 rounded-md">No hay firmas pendientes en este módulo 🎉</p>; 
}
