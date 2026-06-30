import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ResponseData {
  [criterionId: string]: { score: number | null; response_value: string; comments: string };
}

export default function PortalEvaluaciones() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['portal-evaluaciones', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('evaluations')
        .select('id, period, evaluation_date, overall_score, status, evaluator_id, employee_id, template_id, evaluation_templates(name, scale_min, scale_max)')
        .or(`employee_id.eq.${eid},evaluator_id.eq.${eid}`)
        .order('evaluation_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis evaluaciones</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No tienes evaluaciones asignadas.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((ev: any) => {
            const iAmEvaluator = ev.evaluator_id === eid;
            const canRespond = iAmEvaluator && ev.status !== 'completada';
            return (
              <Card key={ev.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{ev.evaluation_templates?.name || 'Evaluación'}</p>
                    <p className="text-sm text-muted-foreground">
                      Período: {ev.period || '—'} · {ev.evaluation_date ?? 's/f'}
                    </p>
                    <p className="text-sm">{iAmEvaluator ? 'Eres el evaluador' : 'Te evalúan'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={ev.status === 'completada' ? 'default' : 'secondary'}>{ev.status}</Badge>
                    {ev.overall_score != null && <p className="text-sm">Puntaje: <span className="font-medium">{ev.overall_score}</span></p>}
                    <Button size="sm" variant={canRespond ? 'default' : 'outline'} onClick={() => setOpenId(ev.id)}>
                      {canRespond ? 'Responder' : 'Ver'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {openId && (
        <EvaluacionDialog
          evaluationId={openId}
          onClose={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ['portal-evaluaciones', eid] }); }}
        />
      )}
    </EmployeePortalLayout>
  );
}

function EvaluacionDialog({ evaluationId, onClose }: { evaluationId: string; onClose: () => void }) {
  const { employee } = useEmployeePortalAuth();
  const [responses, setResponses] = useState<ResponseData>({});
  const [strengths, setStrengths] = useState('');
  const [areas, setAreas] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [generalComments, setGeneralComments] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-evaluacion-detail', evaluationId],
    queryFn: async () => {
      const { data: ev, error: evErr } = await portalSupabase.from('evaluations')
        .select('id, template_id, evaluator_id, employee_id, status, comments, strengths, areas_improvement, action_plan, evaluation_templates(name, scale_min, scale_max)')
        .eq('id', evaluationId).maybeSingle();
      if (evErr) throw evErr;
      const { data: sections } = await portalSupabase.from('evaluation_template_sections')
        .select('id, name, description, sort_order, weight')
        .eq('template_id', ev!.template_id)
        .order('sort_order');
      const sectionIds = (sections || []).map((s: any) => s.id);
      const { data: criteria } = sectionIds.length
        ? await portalSupabase.from('evaluation_template_criteria')
            .select('id, section_id, name, description, response_type, options, sort_order')
            .in('section_id', sectionIds)
            .order('sort_order')
        : { data: [] as any[] };
      const { data: existing } = await portalSupabase.from('evaluation_responses')
        .select('criterion_id, score, response_value, comments')
        .eq('evaluation_id', evaluationId);
      return { ev, sections: sections || [], criteria: criteria || [], existing: existing || [] };
    },
  });

  useEffect(() => {
    if (!data) return;
    const init: ResponseData = {};
    data.criteria.forEach((c: any) => {
      const r = data.existing.find((x: any) => x.criterion_id === c.id);
      init[c.id] = {
        score: r?.score ?? null,
        response_value: r?.response_value ?? '',
        comments: r?.comments ?? '',
      };
    });
    setResponses(init);
    setStrengths(data.ev?.strengths || '');
    setAreas(data.ev?.areas_improvement || '');
    setActionPlan(data.ev?.action_plan || '');
    setGeneralComments(data.ev?.comments || '');
  }, [data]);

  const canEdit = data?.ev?.evaluator_id === employee?.id && data?.ev?.status !== 'completada';
  const scaleMin = data?.ev?.evaluation_templates?.scale_min ?? 1;
  const scaleMax = data?.ev?.evaluation_templates?.scale_max ?? 5;

  const setR = (cid: string, patch: Partial<ResponseData[string]>) =>
    setResponses((p) => ({ ...p, [cid]: { ...(p[cid] || { score: null, response_value: '', comments: '' }), ...patch } }));

  const total = data?.criteria.length ?? 0;
  const answered = Object.values(responses).filter((r) => r.score !== null || (r.response_value && r.response_value !== '')).length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  const submit = async (finalize: boolean) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const rows = Object.entries(responses)
        .filter(([_, r]) => r.score !== null || (r.response_value && r.response_value !== ''))
        .map(([cid, r]) => ({
          evaluation_id: evaluationId,
          criterion_id: cid,
          score: r.score,
          response_value: r.response_value || null,
          comments: r.comments || null,
        }));

      const { error: delErr } = await portalSupabase.from('evaluation_responses').delete().eq('evaluation_id', evaluationId);
      if (delErr) throw delErr;
      if (rows.length > 0) {
        const { error: insErr } = await portalSupabase.from('evaluation_responses').insert(rows);
        if (insErr) throw insErr;
      }

      let overallScore: number | null = null;
      if (finalize) {
        const { data: scoreData } = await portalSupabase.rpc('calculate_evaluation_score', { _evaluation_id: evaluationId });
        overallScore = scoreData as any;
      }

      const update: any = {
        status: finalize ? 'completada' : 'en_proceso',
        strengths: strengths || null,
        areas_improvement: areas || null,
        action_plan: actionPlan || null,
        comments: generalComments || null,
      };
      if (finalize) {
        update.overall_score = overallScore;
        update.evaluation_date = new Date().toISOString().slice(0, 10);
      }
      const { error: updErr } = await portalSupabase.from('evaluations').update(update).eq('id', evaluationId);
      if (updErr) throw updErr;

      toast.success(finalize ? 'Evaluación enviada' : 'Borrador guardado');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (c: any) => {
    const r = responses[c.id] || { score: null, response_value: '', comments: '' };
    const options: string[] = Array.isArray(c.options) ? c.options : [];
    switch (c.response_type) {
      case 'scale':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Slider min={scaleMin} max={scaleMax} step={1} disabled={!canEdit}
                value={[r.score ?? scaleMin]}
                onValueChange={([v]) => setR(c.id, { score: v })} className="flex-1" />
              <Badge variant="outline" className="min-w-[3rem] justify-center text-base font-bold">{r.score ?? '-'}</Badge>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>{scaleMin}</span><span>{scaleMax}</span></div>
          </div>
        );
      case 'single_choice':
        return (
          <RadioGroup value={r.response_value} onValueChange={(v) => setR(c.id, { response_value: v })} disabled={!canEdit}>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${c.id}-${i}`} />
                <Label htmlFor={`${c.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'multiple_choice': {
        const selected = r.response_value ? r.response_value.split('||') : [];
        return (
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`${c.id}-${i}`} checked={selected.includes(opt)} disabled={!canEdit}
                  onCheckedChange={(ck) => {
                    const next = ck ? [...selected, opt] : selected.filter((s) => s !== opt);
                    setR(c.id, { response_value: next.join('||') });
                  }} />
                <Label htmlFor={`${c.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
              </div>
            ))}
          </div>
        );
      }
      case 'yes_no':
        return (
          <div className="flex items-center gap-3">
            <Switch checked={r.response_value === 'Sí'} disabled={!canEdit}
              onCheckedChange={(v) => setR(c.id, { response_value: v ? 'Sí' : 'No' })} />
            <span className="text-sm font-medium">{r.response_value || 'Sin responder'}</span>
          </div>
        );
      case 'open_text':
        return (
          <Textarea placeholder="Escriba su respuesta..." value={r.response_value} disabled={!canEdit}
            onChange={(e) => setR(c.id, { response_value: e.target.value })} rows={3} />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.ev?.evaluation_templates?.name || 'Evaluación'}</DialogTitle>
          <DialogDescription>
            {canEdit ? 'Completa cada criterio y envía cuando termines.' : 'Solo lectura.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {canEdit && total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">{answered}/{total} respondidas</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {data!.sections.map((s: any) => (
              <div key={s.id} className="space-y-3">
                <div className="border-b pb-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
                {data!.criteria.filter((c: any) => c.section_id === s.id).map((c: any) => (
                  <div key={c.id} className="space-y-2 p-3 rounded border bg-muted/20">
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    {renderInput(c)}
                    <Textarea disabled={!canEdit} placeholder="Comentarios (opcional)"
                      value={responses[c.id]?.comments || ''}
                      onChange={(e) => setR(c.id, { comments: e.target.value })} rows={2} />
                  </div>
                ))}
              </div>
            ))}

            {canEdit && (
              <div className="grid gap-3 pt-2 border-t">
                <div>
                  <Label className="text-sm">Fortalezas</Label>
                  <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label className="text-sm">Áreas de mejora</Label>
                  <Textarea value={areas} onChange={(e) => setAreas(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label className="text-sm">Plan de acción</Label>
                  <Textarea value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label className="text-sm">Comentarios generales</Label>
                  <Textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} />
                </div>
              </div>
            )}

            {canEdit ? (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" disabled={saving} onClick={() => submit(false)}>Guardar borrador</Button>
                <Button disabled={saving} onClick={() => submit(true)}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enviar evaluación
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Esta evaluación ya fue completada o no eres el evaluador.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
