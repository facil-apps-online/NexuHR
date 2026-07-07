import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shirt, CalendarDays, BookOpen, Monitor, HeartPulse, Stethoscope, 
  GraduationCap, ShieldCheck, ClipboardCheck, Paperclip
} from 'lucide-react';
import { useMemo } from 'react';
import { PortalEvidenceUpload } from '@/components/portal/PortalEvidenceUpload';

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

export default function PortalPendientesHacer() {
  const { employee, account } = useEmployeePortalAuth();
  const eid = employee?.id;
  const tenantId = account?.tenant_id;

  // 1. Fetch enabled modules for evidences from tenant_settings
  const { data: enabledModules = [], isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['portal-evidence-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('tenant_settings')
        .select('settings_data')
        .eq('tenant_id', tenantId!)
        .eq('setting_key', 'signatures')
        .maybeSingle();
      return ((data?.settings_data as any)?.evidence_modules || []) as string[];
    },
  });

  // Helper to fetch all records that already have evidence uploaded
  const fetchUploadedIds = async (moduleCode: string) => {
    if (!tenantId || !eid) return new Set<string>();
    const { data } = await portalSupabase
      .from('evidences')
      .select('record_id')
      .eq('tenant_id', tenantId)
      .eq('employee_id', eid)
      .eq('module', moduleCode);
    return new Set((data || []).map((e: any) => e.record_id));
  };

  // 2. Fetch data dynamically for each enabled module
  const { data: dotacionData, isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['portal-pending-evidence', 'dotacion', eid],
    enabled: !!eid && enabledModules.includes('dotacion'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('dotacion');
      const { data } = await portalSupabase.from('dotacion').select('id, item_name, delivery_date').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: d.item_name, subtitle: `Entregado: ${d.delivery_date ?? 's/f'}`
      }));
    }
  });

  const { data: eventosData, isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['portal-pending-evidence', 'eventos', eid],
    enabled: !!eid && enabledModules.includes('eventos'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('eventos');
      const { data } = await portalSupabase.from('event_participants').select('id, events(title, event_date)').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: (d.events as any)?.title || 'Evento', subtitle: `Fecha: ${(d.events as any)?.event_date ?? 's/f'}`
      }));
    }
  });

  const { data: reglamentoData, isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['portal-pending-evidence', 'reglamento', eid],
    enabled: !!eid && enabledModules.includes('reglamento'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('reglamento');
      const { data } = await portalSupabase.from('regulation_acknowledgments').select('id, regulations(title)').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: (d.regulations as any)?.title || 'Reglamento', subtitle: 'Requiere adjuntar soporte'
      }));
    }
  });

  const { data: evaluacionesData, isLoading: l4, refetch: r4 } = useQuery({
    queryKey: ['portal-pending-evidence', 'evaluaciones', eid],
    enabled: !!eid && enabledModules.includes('evaluaciones'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('evaluaciones');
      const { data } = await portalSupabase.from('evaluations' as any).select('id, period, evaluation_date').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: `Evaluación ${d.period}`, subtitle: `Fecha: ${d.evaluation_date ?? 's/f'}`
      }));
    }
  });

  const { data: examenesData, isLoading: l5, refetch: r5 } = useQuery({
    queryKey: ['portal-pending-evidence', 'examenes', eid],
    enabled: !!eid && enabledModules.includes('examenes'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('examenes');
      const { data } = await portalSupabase.from('exams' as any).select('id, exam_type, exam_date').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: `Examen: ${d.exam_type}`, subtitle: `Fecha: ${d.exam_date ?? 's/f'}`
      }));
    }
  });

  const { data: incapacidadesData, isLoading: l6, refetch: r6 } = useQuery({
    queryKey: ['portal-pending-evidence', 'incapacidades', eid],
    enabled: !!eid && enabledModules.includes('incapacidades'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('incapacidades');
      const { data } = await portalSupabase.from('incapacidades' as any).select('id, tipo, fecha_inicio').eq('employee_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: `Incapacidad: ${d.tipo}`, subtitle: `Inicio: ${d.fecha_inicio ?? 's/f'}`
      }));
    }
  });

  const { data: activosData, isLoading: l7, refetch: r7 } = useQuery({
    queryKey: ['portal-pending-evidence', 'activos_fijos', eid],
    enabled: !!eid && enabledModules.includes('activos_fijos'),
    queryFn: async () => {
      const uploadedIds = await fetchUploadedIds('activos_fijos');
      const { data } = await portalSupabase.from('activos_fijos' as any).select('id, modelo, nombre').eq('empleado_asignado_id', eid!);
      return (data || []).filter(d => !uploadedIds.has(d.id)).map(d => ({
        id: d.id, title: d.nombre || 'Activo Fijo', subtitle: `Modelo: ${d.modelo ?? 's/f'}`
      }));
    }
  });

  const isAnyLoading = loadingSettings || l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const sections = useMemo(() => {
    const list = [];
    if (enabledModules.includes('dotacion')) list.push({ key: 'dotacion', data: dotacionData || [], refetch: r1 });
    if (enabledModules.includes('eventos')) list.push({ key: 'eventos', data: eventosData || [], refetch: r2 });
    if (enabledModules.includes('reglamento')) list.push({ key: 'reglamento', data: reglamentoData || [], refetch: r3 });
    if (enabledModules.includes('evaluaciones')) list.push({ key: 'evaluaciones', data: evaluacionesData || [], refetch: r4 });
    if (enabledModules.includes('examenes')) list.push({ key: 'examenes', data: examenesData || [], refetch: r5 });
    if (enabledModules.includes('incapacidades')) list.push({ key: 'incapacidades', data: incapacidadesData || [], refetch: r6 });
    if (enabledModules.includes('activos_fijos')) list.push({ key: 'activos_fijos', data: activosData || [], refetch: r7 });
    return list;
  }, [enabledModules, dotacionData, eventosData, reglamentoData, evaluacionesData, examenesData, incapacidadesData, activosData]);

  return (
    <EmployeePortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pendientes por cargar (Soportes)</h1>
        <p className="text-muted-foreground mt-1">Sube los archivos y evidencias solicitadas por tu empresa.</p>
      </div>
      
      {isAnyLoading ? <p className="text-muted-foreground">Cargando pendientes...</p> : (
        <div className="space-y-6">
          {sections.length === 0 ? (
            <p className="text-muted-foreground">Tu empresa no tiene módulos de evidencia habilitados.</p>
          ) : sections.map((section) => (
            <Section 
              key={section.key} 
              title={moduleTitles[section.key]} 
              icon={moduleIcons[section.key] || Paperclip} 
            >
              {section.data.length === 0 ? <Empty /> : section.data.map((item: any) => (
                <Item 
                  key={item.id} 
                  title={item.title} 
                  subtitle={item.subtitle} 
                  module={section.key}
                  recordId={item.id}
                  onUploaded={() => section.refetch()}
                />
              ))}
            </Section>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" /> 
          {title}
        </h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ title, subtitle, module, recordId, onUploaded }: any) {
  return (
    <Card className="p-4 flex items-center justify-between bg-card hover:bg-accent/10 transition-colors border-l-4 border-l-info">
      <div>
        <p className="font-medium text-sm md:text-base">{title}</p>
        <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-info/20 text-info-foreground border-info/30 hidden sm:inline-flex">Falta soporte</Badge>
        <PortalEvidenceUpload 
          module={module}
          recordId={recordId}
          onUploaded={onUploaded}
          buttonLabel="Cargar archivo"
        />
      </div>
    </Card>
  );
}

function Empty() { 
  return <p className="text-sm text-muted-foreground italic px-4 py-2 bg-muted/30 rounded-md">No tienes archivos pendientes por subir aquí 🎉</p>; 
}
