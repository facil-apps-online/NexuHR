import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PortalAccountActions } from '@/components/portal/PortalAccountActions';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Globe, Copy, CheckCheck, Lock, Camera, Pencil } from 'lucide-react';

export function PortalAccountsSettings() {
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();
  const { currentAssignment } = useAuth();
  const tenantId = currentAssignment?.tenant_id;
  const platformId = currentAssignment?.platform_id;

  const { data: portalSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['tenant-settings-portal', tenantId],
    queryFn: async () => {
      if (!tenantId || !platformId) return { slug: 'Funcionarios', can_change_photo: true, can_change_data: true };
      const { data } = await supabase
        .from('tenant_settings')
        .select('settings_data')
        .eq('tenant_id', tenantId)
        .eq('platform_id', platformId)
        .eq('setting_key', 'portal')
        .maybeSingle();
      const settings = data?.settings_data as { slug?: string; can_change_photo?: boolean; can_change_data?: boolean } | null;
      return {
        slug: settings?.slug || 'Funcionarios',
        can_change_photo: settings?.can_change_photo ?? true,
        can_change_data: settings?.can_change_data ?? true,
      };
    },
    enabled: !!tenantId && !!platformId,
  });

  const [slug, setSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [canChangePhoto, setCanChangePhoto] = useState(true);
  const [canChangeData, setCanChangeData] = useState(true);
  const [originalSlug, setOriginalSlug] = useState('');

  const hasSlugChanged = slug !== originalSlug;

  const saveSettings = useMutation({
    mutationFn: async (newSettings: { slug: string; can_change_photo: boolean; can_change_data: boolean }) => {
      if (!tenantId || !platformId) throw new Error('Tenant no disponible');
      const { error } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: tenantId,
          platform_id: platformId,
          setting_key: 'portal',
          settings_data: newSettings,
        }, { onConflict: 'tenant_id, platform_id, setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings-portal', tenantId] });
      toast.success('Configuración del portal actualizada');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Error al guardar');
    },
  });

  // Sync from query data
  const [synced, setSynced] = useState(false);
  if (!synced && portalSettings && slug === '') {
    setSlug(portalSettings.slug);
    setCanChangePhoto(portalSettings.can_change_photo);
    setCanChangeData(portalSettings.can_change_data);
    setOriginalSlug(portalSettings.slug);
    setSynced(true);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['portal-accounts-list'],
    queryFn: async () => {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number, position, active')
        .order('first_name');
      const { data: accs } = await supabase
        .from('employee_portal_accounts')
        .select('employee_id, status, last_login_at, must_change_password');
      const byId = new Map((accs || []).map((a) => [a.employee_id, a]));
      return (emps || []).map((e) => ({ ...e, account: byId.get(e.id) }));
    },
  });

  const filtered = (data || []).filter((r) => {
    const t = q.toLowerCase();
    return !t || r.first_name?.toLowerCase().includes(t) || r.last_name?.toLowerCase().includes(t) || r.document_number?.toLowerCase().includes(t);
  });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Portal del Empleado</h2>
          <p className="text-sm text-muted-foreground">Activa, resetea o revoca el acceso de cada empleado al portal.</p>
        </div>
        <Input placeholder="Buscar por nombre o documento..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      {/* Portal slug configuration */}
      <div className="flex items-end gap-3 p-4 rounded-lg border bg-muted/20">
        <Globe className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
        <div className="flex-1 space-y-1">
          <Label htmlFor="portal-slug" className="text-sm font-medium">Slug del portal (URL de acceso)</Label>
          <p className="text-xs text-muted-foreground">
            Ejemplo: si el slug es <strong>MiEmpresa</strong>, los empleados ingresan por <strong>nexuhr.pro/MiEmpresa</strong>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">nexuhr.pro/</span>
            <Input
              id="portal-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Funcionarios"
              className="max-w-[200px] font-mono"
            />
            <Button
              size="sm"
              onClick={() => {
                setOriginalSlug(slug);
                saveSettings.mutate({ slug, can_change_photo: canChangePhoto, can_change_data: canChangeData });
              }}
              disabled={saveSettings.isPending || settingsLoading || !slug.trim() || !hasSlugChanged}
            >
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              disabled={!slug.trim()}
            >
              {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Portal permissions */}
      <div className="flex items-center gap-6 p-4 rounded-lg border bg-muted/20">
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="space-y-3">
          <p className="text-sm font-medium">Permisos del empleado en el portal</p>
          <div className="flex items-center gap-4">
            <Label htmlFor="can-change-photo" className="flex items-center gap-2 cursor-pointer">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cambiar foto</span>
            </Label>
            <Switch
              id="can-change-photo"
              checked={canChangePhoto}
              onCheckedChange={(v) => {
                setCanChangePhoto(v);
                saveSettings.mutate({ slug, can_change_photo: v, can_change_data: canChangeData });
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            <Label htmlFor="can-change-data" className="flex items-center gap-2 cursor-pointer">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Editar datos personales</span>
            </Label>
            <Switch
              id="can-change-data"
              checked={canChangeData}
              onCheckedChange={(v) => {
                setCanChangeData(v);
                saveSettings.mutate({ slug, can_change_photo: canChangePhoto, can_change_data: v });
              }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="hidden sm:table-cell">Documento</TableHead>
              <TableHead className="hidden sm:table-cell">Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Último ingreso</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Cargando…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={5}>Sin resultados</TableCell></TableRow>}
            {filtered.map((r) => {
              const status = r.account?.status;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.first_name} {r.last_name}</div>
                    <div className="text-xs text-muted-foreground">{r.position || '—'}</div>
                    {/* Mobile-only compact info */}
                    <div className="flex items-center gap-2 mt-1 sm:hidden">
                      <span className="text-xs font-mono text-muted-foreground">{r.document_number}</span>
                      {!r.account && <Badge variant="secondary" className="text-[10px] h-4 px-1">Sin cuenta</Badge>}
                      {status === 'active' && <Badge className="text-[10px] h-4 px-1">Activo</Badge>}
                      {status === 'revoked' && <Badge variant="destructive" className="text-[10px] h-4 px-1">Revocado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono">{r.document_number}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {!r.account && <Badge variant="secondary">Sin cuenta</Badge>}
                    {status === 'active' && <Badge>Activo</Badge>}
                    {status === 'revoked' && <Badge variant="destructive">Revocado</Badge>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{r.account?.last_login_at ? new Date(r.account.last_login_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <PortalAccountActions employeeId={r.id} documentNumber={r.document_number} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
