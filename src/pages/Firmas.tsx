import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SignatureDialog } from "@/components/firmas/SignatureDialog";
import {
  PenTool,
  CheckCircle,
  Clock,
  Loader2,
  Shirt,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Monitor,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  ShieldCheck,
  Users,
  FileSignature
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PendingSignature {
  id: string;
  module: string;
  recordId: string;
  employeeId: string;
  employeeName: string;
  source: string;
  date: string;
}

const moduleLabels: Record<string, { label: string; icon: any; className: string }> = {
  eventos: { label: "Eventos", icon: Calendar, className: "bg-primary/10 text-primary" },
  dotacion: { label: "Dotación", icon: Shirt, className: "bg-warning/10 text-warning" },
  evaluaciones: { label: "Eval. Desempeño", icon: ClipboardCheck, className: "bg-info/10 text-info" },
  reglamento: { label: "Reglamentos", icon: BookOpen, className: "bg-success/10 text-success" },
  activos_fijos: { label: "Activos Fijos", icon: Monitor, className: "bg-purple-500/10 text-purple-500" },
  incapacidades: { label: "Incapacidades", icon: HeartPulse, className: "bg-red-500/10 text-red-500" },
  examenes: { label: "Exámenes", icon: Stethoscope, className: "bg-blue-500/10 text-blue-500" },
  cursos: { label: "Cursos", icon: GraduationCap, className: "bg-orange-500/10 text-orange-500" },
  vigilancias: { label: "Vigilancias", icon: ShieldCheck, className: "bg-teal-500/10 text-teal-500" },
  empleados: { label: "Empleados", icon: Users, className: "bg-gray-500/10 text-gray-500" },
};

export default function Firmas() {
  const { profile, currentAssignment } = useAuth();
  const tenantId = profile?.tenant_id;
  const platformId = currentAssignment?.platform_id;
  const [signatureTarget, setSignatureTarget] = useState<PendingSignature | null>(null);

  // 1. Fetch Tenant Settings for signature modules
  const { data: settings } = useQuery({
    queryKey: ["tenant-settings-signatures", tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return [];
      const { data } = await supabase
        .from("tenant_settings")
        .select("settings_data")
        .eq("tenant_id", tenantId)
        .eq("platform_id", platformId)
        .eq("setting_key", "signatures")
        .maybeSingle();
      return ((data?.settings_data as any)?.signature_modules || []) as string[];
    },
    enabled: !!tenantId && !!platformId,
  });

  const enabledModules = settings || [];

  // Helper to fetch all signed record IDs for a specific module
  const fetchSignedIds = async (moduleCode: string) => {
    if (!tenantId) return new Set<string>();
    
    const modulesToFetch = moduleCode === 'reglamento' ? ['reglamento', 'reglamentos'] : [moduleCode];
    
    const { data } = await supabase
      .from("signatures" as any)
      .select("record_id")
      .eq("tenant_id", tenantId)
      .in("module", modulesToFetch);
    return new Set((data || []).map((s: any) => s.record_id));
  };

  // 2. Query for each module (only if enabled)
  const { data: eventPending, isLoading: l1 } = useQuery({
    queryKey: ["pending-signatures", "eventos"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("eventos");
      const { data, error } = await supabase
        .from("event_participants" as any)
        .select("id, employee:employees(id, first_name, last_name), event:events(title, event_date)");
      if (error) throw error;
      return (data as any[])
        .filter(p => !signedIds.has(p.id))
        .map(p => ({
          id: p.id, module: "eventos", recordId: p.id,
          employeeId: p.employee?.id, employeeName: p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : "Desconocido",
          source: p.event?.title || "Evento", date: p.event?.event_date || "",
        }));
    },
    enabled: enabledModules.includes("eventos"),
  });

  const { data: dotacionPending, isLoading: l2 } = useQuery({
    queryKey: ["pending-signatures", "dotacion"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("dotacion");
      const { data, error } = await supabase
        .from("dotacion")
        .select("id, item_name, delivery_date, employee_id, employees(id, first_name, last_name)");
      if (error) throw error;
      return (data as any[])
        .filter(d => !signedIds.has(d.id))
        .map(d => ({
          id: d.id, module: "dotacion", recordId: d.id,
          employeeId: d.employees?.id || d.employee_id, employeeName: d.employees ? `${d.employees.first_name} ${d.employees.last_name}` : "Desconocido",
          source: d.item_name, date: d.delivery_date || "",
        }));
    },
    enabled: enabledModules.includes("dotacion"),
  });

  const { data: reglamentosPending, isLoading: l3 } = useQuery({
    queryKey: ["pending-signatures", "reglamento"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("reglamento");
      const { data, error } = await supabase
        .from("regulation_acknowledgments")
        .select("id, employee_id, employees(id, first_name, last_name), regulations(title, requires_signature)");
      if (error) throw error;
      return (data as any[])
        .filter(r => r.regulations?.requires_signature !== false && !signedIds.has(r.id))
        .map(r => ({
          id: r.id, module: "reglamento", recordId: r.id,
          employeeId: r.employees?.id || r.employee_id, employeeName: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "Desconocido",
          source: r.regulations?.title || "Reglamento", date: "",
        }));
    },
    enabled: enabledModules.includes("reglamento"),
  });

  const { data: evaluacionesPending, isLoading: l4 } = useQuery({
    queryKey: ["pending-signatures", "evaluaciones"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("evaluaciones");
      const { data, error } = await supabase
        .from("evaluations" as any)
        .select("id, period, evaluation_date, employee_id, employees(id, first_name, last_name)");
      if (error) throw error;
      return (data as any[])
        .filter(e => !signedIds.has(e.id))
        .map(e => ({
          id: e.id, module: "evaluaciones", recordId: e.id,
          employeeId: e.employees?.id || e.employee_id, employeeName: e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : "Desconocido",
          source: `Evaluación ${e.period || ""}`, date: e.evaluation_date || "",
        }));
    },
    enabled: enabledModules.includes("evaluaciones"),
  });

  const { data: examenesPending, isLoading: l5 } = useQuery({
    queryKey: ["pending-signatures", "examenes"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("examenes");
      const { data, error } = await supabase
        .from("exams" as any)
        .select("id, exam_type, exam_date, employee_id, employees(id, first_name, last_name)");
      if (error) throw error;
      return (data as any[])
        .filter(e => !signedIds.has(e.id))
        .map(e => ({
          id: e.id, module: "examenes", recordId: e.id,
          employeeId: e.employees?.id || e.employee_id, employeeName: e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : "Desconocido",
          source: `Examen: ${e.exam_type}`, date: e.exam_date || "",
        }));
    },
    enabled: enabledModules.includes("examenes"),
  });

  const { data: incapacidadesPending, isLoading: l6 } = useQuery({
    queryKey: ["pending-signatures", "incapacidades"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("incapacidades");
      const { data, error } = await supabase
        .from("incapacidades" as any)
        .select("id, tipo, fecha_inicio, employee_id, employees(id, first_name, last_name)");
      if (error) throw error;
      return (data as any[])
        .filter(i => !signedIds.has(i.id))
        .map(i => ({
          id: i.id, module: "incapacidades", recordId: i.id,
          employeeId: i.employees?.id || i.employee_id, employeeName: i.employees ? `${i.employees.first_name} ${i.employees.last_name}` : "Desconocido",
          source: `Incapacidad: ${i.tipo}`, date: i.fecha_inicio || "",
        }));
    },
    enabled: enabledModules.includes("incapacidades"),
  });

  const { data: activosPending, isLoading: l7 } = useQuery({
    queryKey: ["pending-signatures", "activos_fijos"],
    queryFn: async () => {
      const signedIds = await fetchSignedIds("activos_fijos");
      const { data, error } = await supabase
        .from("activos_fijos" as any)
        .select("id, modelo, empleado_asignado_id, employees!activos_fijos_empleado_asignado_id_fkey(id, first_name, last_name)")
        .not("empleado_asignado_id", "is", null);
      if (error) throw error;
      return (data as any[])
        .filter(a => !signedIds.has(a.id))
        .map(a => ({
          id: a.id, module: "activos_fijos", recordId: a.id,
          employeeId: a.employees?.id || a.empleado_asignado_id, employeeName: a.employees ? `${a.employees.first_name} ${a.employees.last_name}` : "Desconocido",
          source: `Activo: ${a.modelo}`, date: "",
        }));
    },
    enabled: enabledModules.includes("activos_fijos"),
  });

  // Fetch completed signatures
  const { data: completedSignatures, isLoading: loadingCompleted } = useQuery({
    queryKey: ["signatures", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("signatures" as any)
        .select("*, employee:employees(first_name, last_name)")
        .eq("tenant_id", tenantId)
        .order("signed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const allPending = useMemo(() => [
    ...(eventPending || []),
    ...(dotacionPending || []),
    ...(reglamentosPending || []),
    ...(evaluacionesPending || []),
    ...(examenesPending || []),
    ...(incapacidadesPending || []),
    ...(activosPending || []),
  ], [eventPending, dotacionPending, reglamentosPending, evaluacionesPending, examenesPending, incapacidadesPending, activosPending]);

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const pendingByModule = (mod: string) => allPending.filter((p) => p.module === mod);

  const stats = {
    total: allPending.length,
    completed: completedSignatures?.length || 0,
  };

  const renderPendingCard = (item: PendingSignature) => {
    const modInfo = moduleLabels[item.module] || moduleLabels.eventos;
    const ModIcon = modInfo.icon || FileSignature;
    return (
      <div
        key={`${item.module}-${item.id}`}
        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${modInfo.className}`}>
            <ModIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{item.employeeName}</p>
            <p className="text-xs text-muted-foreground">{item.source}</p>
            {item.date && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.date + "T12:00:00"), "d MMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {modInfo.label}
          </Badge>
          <Button size="sm" onClick={() => setSignatureTarget(item)}>
            <PenTool className="mr-1 h-3 w-3" /> Firmar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Centro de Firmas</h1>
          <p className="mt-1 text-muted-foreground">
            Gestión centralizada de todas las firmas pendientes del sistema
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-warning/10 p-3 text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Pendientes totales</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-success/10 p-3 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Firmas registradas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <FileSignature className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enabledModules.length}</p>
              <p className="text-sm text-muted-foreground">Módulos activos</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Todas ({allPending.length})</TabsTrigger>
              {enabledModules.map(mod => {
                const label = moduleLabels[mod]?.label || mod;
                const count = pendingByModule(mod).length;
                return (
                  <TabsTrigger key={mod} value={mod}>
                    {label} ({count})
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="completed">Completadas ({stats.completed})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {allPending.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="mx-auto mb-3 h-12 w-12 text-success/50" />
                    <p className="text-muted-foreground">No hay firmas pendientes</p>
                  </CardContent>
                </Card>
              ) : (
                allPending.map(renderPendingCard)
              )}
            </TabsContent>

            {enabledModules.map(mod => (
              <TabsContent key={`tab-${mod}`} value={mod} className="space-y-3">
                {pendingByModule(mod).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin firmas pendientes</p>
                ) : (
                  pendingByModule(mod).map(renderPendingCard)
                )}
              </TabsContent>
            ))}

            <TabsContent value="completed" className="space-y-3">
              {loadingCompleted ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !completedSignatures || completedSignatures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin firmas registradas aún</p>
              ) : (
                completedSignatures.map((s: any) => {
                  const modInfo = moduleLabels[s.module] || moduleLabels.eventos;
                  const ModIcon = modInfo?.icon || FileSignature;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 bg-success/10 text-success`}>
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {s.employee ? `${s.employee.first_name} ${s.employee.last_name}` : "Empleado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.signed_at && format(new Date(s.signed_at), "d MMM yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{modInfo?.label || s.module}</Badge>
                        <Badge className="text-xs bg-success/10 text-success border-success/20">
                          {s.method === "canvas" ? "Canvas" : "Confirmación"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {signatureTarget && tenantId && (
        <SignatureDialog
          open={!!signatureTarget}
          onOpenChange={(open) => { if (!open) setSignatureTarget(null); }}
          module={signatureTarget.module}
          recordId={signatureTarget.recordId}
          employeeId={signatureTarget.employeeId}
          employeeName={signatureTarget.employeeName}
          tenantId={tenantId}
        />
      )}
    </MainLayout>
  );
}
