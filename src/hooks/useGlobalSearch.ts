import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";

const MAX_RESULTS_PER_CATEGORY = 5;

export type SearchCategory =
  | "empleados"
  | "cursos"
  | "evaluaciones"
  | "incapacidades"
  | "examenes"
  | "vigilancias"
  | "eventos"
  | "comunicaciones"
  | "dotacion"
  | "reglamentos";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  route: string;
  icon: string;
}

const CATEGORY_META: Record<SearchCategory, { label: string; route: string; icon: string }> = {
  empleados: { label: "Empleados", route: "/empleados", icon: "Users" },
  cursos: { label: "Cursos", route: "/cursos", icon: "GraduationCap" },
  evaluaciones: { label: "Evaluaciones", route: "/evaluaciones", icon: "ClipboardCheck" },
  incapacidades: { label: "Incapacidades", route: "/incapacidades", icon: "HeartPulse" },
  examenes: { label: "Exámenes", route: "/examenes", icon: "Stethoscope" },
  vigilancias: { label: "Vigilancias", route: "/vigilancias", icon: "ShieldCheck" },
  eventos: { label: "Eventos", route: "/eventos", icon: "FileSignature" },
  comunicaciones: { label: "Comunicaciones", route: "/comunicaciones", icon: "Mail" },
  dotacion: { label: "Dotación", route: "/dotacion", icon: "Shirt" },
  reglamentos: { label: "Reglamentos", route: "/reglamento", icon: "BookOpen" },
};

async function searchEmployees(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, document_number, position, department")
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},document_number.ilike.${pattern},position.ilike.${pattern},department.ilike.${pattern}`)
    .eq("active", true)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((e) => ({
    id: e.id,
    title: `${e.first_name} ${e.last_name}`,
    subtitle: [e.position, e.department, e.document_number].filter(Boolean).join(" · "),
    category: "empleados" as SearchCategory,
    route: `/empleados/${e.id}`,
    icon: CATEGORY_META.empleados.icon,
  }));
}

async function searchCourses(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name, provider, status, employee_id, employees(first_name, last_name)")
    .or(`course_name.ilike.${pattern},provider.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((c: any) => ({
    id: c.id,
    title: c.course_name,
    subtitle: [c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : null, c.provider, c.status]
      .filter(Boolean)
      .join(" · "),
    category: "cursos" as SearchCategory,
    route: `/cursos`,
    icon: CATEGORY_META.cursos.icon,
  }));
}

async function searchEvaluations(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("evaluations")
    .select("id, period, status, overall_score, employee_id, employees(first_name, last_name)")
    .or(`period.ilike.${pattern},status.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((e: any) => ({
    id: e.id,
    title: `Evaluación - ${e.period}`,
    subtitle: [
      e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : null,
      e.status,
      e.overall_score != null ? `Score: ${e.overall_score}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    category: "evaluaciones" as SearchCategory,
    route: `/evaluaciones`,
    icon: CATEGORY_META.evaluaciones.icon,
  }));
}

async function searchIncapacidades(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("incapacidades")
    .select("id, tipo, diagnostico, entidad, estado, employee_id, employees(first_name, last_name)")
    .or(`tipo.ilike.${pattern},diagnostico.ilike.${pattern},entidad.ilike.${pattern},codigo_cie.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((i: any) => ({
    id: i.id,
    title: `${i.tipo} - ${i.diagnostico || "Sin diagnóstico"}`,
    subtitle: [
      i.employees ? `${i.employees.first_name} ${i.employees.last_name}` : null,
      i.entidad,
      i.estado,
    ]
      .filter(Boolean)
      .join(" · "),
    category: "incapacidades" as SearchCategory,
    route: `/incapacidades`,
    icon: CATEGORY_META.incapacidades.icon,
  }));
}

async function searchExamenes(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("exams")
    .select("id, exam_type, entity, result, status, employee_id, employees(first_name, last_name)")
    .or(`exam_type.ilike.${pattern},entity.ilike.${pattern},result.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.exam_type,
    subtitle: [
      e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : null,
      e.entity,
      e.result,
      e.status,
    ]
      .filter(Boolean)
      .join(" · "),
    category: "examenes" as SearchCategory,
    route: `/examenes`,
    icon: CATEGORY_META.examenes.icon,
  }));
}

async function searchVigilancias(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("vigilancias")
    .select("id, vigilancia_type, diagnosis, status, employee_id, employees(first_name, last_name)")
    .or(`vigilancia_type.ilike.${pattern},diagnosis.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((v: any) => ({
    id: v.id,
    title: v.vigilancia_type,
    subtitle: [
      v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : null,
      v.diagnosis,
      v.status,
    ]
      .filter(Boolean)
      .join(" · "),
    category: "vigilancias" as SearchCategory,
    route: `/vigilancias`,
    icon: CATEGORY_META.vigilancias.icon,
  }));
}

async function searchEventos(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_type, location, status")
    .or(`title.ilike.${pattern},event_type.ilike.${pattern},location.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: [e.event_type, e.location, e.status].filter(Boolean).join(" · "),
    category: "eventos" as SearchCategory,
    route: `/eventos`,
    icon: CATEGORY_META.eventos.icon,
  }));
}

async function searchComunicaciones(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("communications")
    .select("id, subject, communication_type, priority, status")
    .or(`subject.ilike.${pattern},content.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    title: c.subject,
    subtitle: [c.communication_type, c.priority, c.status].filter(Boolean).join(" · "),
    category: "comunicaciones" as SearchCategory,
    route: `/comunicaciones`,
    icon: CATEGORY_META.comunicaciones.icon,
  }));
}

async function searchDotacion(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("dotacion")
    .select("id, item_name, item_type, size, employee_id, employees(first_name, last_name)")
    .or(`item_name.ilike.${pattern},item_type.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.item_name,
    subtitle: [
      d.employees ? `${d.employees.first_name} ${d.employees.last_name}` : null,
      d.item_type,
      d.size,
    ]
      .filter(Boolean)
      .join(" · "),
    category: "dotacion" as SearchCategory,
    route: `/dotacion`,
    icon: CATEGORY_META.dotacion.icon,
  }));
}

async function searchReglamentos(query: string): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("regulations")
    .select("id, title, content_type, status, version")
    .or(`title.ilike.${pattern},content_text.ilike.${pattern}`)
    .limit(MAX_RESULTS_PER_CATEGORY);

  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: [r.content_type, r.status, `v${r.version}`].filter(Boolean).join(" · "),
    category: "reglamentos" as SearchCategory,
    route: `/reglamento`,
    icon: CATEGORY_META.reglamentos.icon,
  }));
}

const SEARCHERS: Record<SearchCategory, (query: string) => Promise<SearchResult[]>> = {
  empleados: searchEmployees,
  cursos: searchCourses,
  evaluaciones: searchEvaluations,
  incapacidades: searchIncapacidades,
  examenes: searchExamenes,
  vigilancias: searchVigilancias,
  eventos: searchEventos,
  comunicaciones: searchComunicaciones,
  dotacion: searchDotacion,
  reglamentos: searchReglamentos,
};

export function useGlobalSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["globalSearch", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return {} as Record<SearchCategory, SearchResult[]>;
      }

      const categories = Object.keys(SEARCHERS) as SearchCategory[];
      const promises = categories.map(async (cat) => {
        try {
          const results = await SEARCHERS[cat](debouncedQuery.trim());
          return [cat, results] as const;
        } catch {
          return [cat, []] as const;
        }
      });

      const settled = await Promise.allSettled(promises);
      const results: Partial<Record<SearchCategory, SearchResult[]>> = {};

      for (const item of settled) {
        if (item.status === "fulfilled") {
          const [cat, data] = item.value;
          if (data.length > 0) {
            results[cat] = data;
          }
        }
      }

      return results;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });
}

export { CATEGORY_META };
