import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useQuery } from '@tanstack/react-query';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { usePortalSlug } from '@/hooks/usePortalSlug';
import { EmployeePhotoUpload } from '@/components/EmployeePhotoUpload';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Briefcase, Phone } from 'lucide-react';
import NotificationPreferencesSettings from "@/components/settings/NotificationPreferencesSettings";

export default function PortalPerfil() {
  const { user, employee, refresh } = useEmployeePortalAuth();
  const { basePath } = usePortalSlug();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '', address: '', city: '', emergency_contact: '', emergency_phone: '', email: '',
  });

  const tenantId = employee?.tenant_id;
  const platformId = import.meta.env.VITE_PLATFORM_ID;
  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : '';
  const initials = employee ? `${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}`.toUpperCase() : '';
  const { displayUrl: photoDisplayUrl } = useGoogleDriveImage(employee?.photo_url || undefined, tenantId);

  const { data: permissions } = useQuery({
    queryKey: ['portal-permissions', tenantId],
    queryFn: async () => {
      if (!tenantId) return { can_change_photo: true, can_change_data: true };
      const { data, error } = await portalSupabase.rpc('get_portal_permissions', { p_tenant_id: tenantId });
      if (error) throw error;
      return {
        can_change_photo: data?.can_change_photo ?? true,
        can_change_data: data?.can_change_data ?? true,
      };
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (employee) {
      const e = employee as any;
      setForm({
        phone: e.phone || '', address: e.address || '', city: e.city || '',
        emergency_contact: e.emergency_contact || '', emergency_phone: e.emergency_phone || '',
        email: employee.email || '',
      });
    }
  }, [employee]);

  const save = async () => {
    if (!employee) return;
    setSaving(true);
    const { error } = await portalSupabase.from('employees').update(form).eq('id', employee.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Datos actualizados');
    await refresh();
  };

  return (
    <EmployeePortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <Button variant="outline" onClick={() => navigate(`${basePath}/cambiar-clave`)}>
          <KeyRound className="h-4 w-4 mr-2" /> Cambiar contraseña
        </Button>
      </div>

      {employee && (
        <Card className="p-6 flex flex-col items-center gap-3">
          {permissions?.can_change_photo ? (
            <EmployeePhotoUpload
              supabase={portalSupabase}
              employeeId={employee.id}
              tenantId={employee.tenant_id}
              platformId={platformId}
              currentPhotoUrl={employee.photo_url}
              employeeName={`${employee.first_name} ${employee.last_name}`}
              onPhotoUpdated={() => refresh()}
              size="lg"
            />
          ) : (
            <Avatar className="h-24 w-24 border bg-primary/10">
              <AvatarImage src={photoDisplayUrl || undefined} alt={employeeName} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Datos laborales
          </CardTitle>
          <CardDescription>Información general del empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadOnly label="Nombre" value={`${employee?.first_name} ${employee?.last_name}`} />
            <ReadOnly label="Documento" value={employee?.document_number} />
            <ReadOnly label="Cargo" value={employee?.position} />
            <ReadOnly label="Área" value={employee?.department} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Datos de contacto
          </CardTitle>
          <CardDescription>Información de contacto y emergencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissions?.can_change_data ? (
              <>
                <Field label="Correo personal" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                <Field label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Contacto de emergencia" value={form.emergency_contact} onChange={(v) => setForm({ ...form, emergency_contact: v })} />
                <Field label="Teléfono de emergencia" value={form.emergency_phone} onChange={(v) => setForm({ ...form, emergency_phone: v })} />
              </>
            ) : (
              <>
                <ReadOnly label="Correo personal" value={form.email} />
                <ReadOnly label="Teléfono" value={form.phone} />
                <ReadOnly label="Dirección" value={form.address} />
                <ReadOnly label="Ciudad" value={form.city} />
                <ReadOnly label="Contacto de emergencia" value={form.emergency_contact} />
                <ReadOnly label="Teléfono de emergencia" value={form.emergency_phone} />
              </>
            )}
          </div>
          {permissions?.can_change_data && (
            <div className="flex justify-end">
              <Button disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {employee && (
        <NotificationPreferencesSettings
          supabase={portalSupabase}
          tenantId={employee.tenant_id}
          userId={user?.id}
          isSuperAdmin={false}
          showSummary={false}
        />
      )}
    </EmployeePortalLayout>
  );
}

function ReadOnly({ label, value }: { label: string; value: any }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-12" />
    </div>
  );
}
