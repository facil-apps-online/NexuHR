import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

export default function PortalPerfil() {
  const { employee, refresh } = useEmployeePortalAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '', address: '', city: '', emergency_contact: '', emergency_phone: '', email: '',
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <Button variant="outline" onClick={() => navigate('/Funcionarios/cambiar-clave')}>
          <KeyRound className="h-4 w-4 mr-2" /> Cambiar contraseña
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Datos laborales (solo lectura)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReadOnly label="Nombre" value={`${employee?.first_name} ${employee?.last_name}`} />
          <ReadOnly label="Documento" value={employee?.document_number} />
          <ReadOnly label="Cargo" value={employee?.position} />
          <ReadOnly label="Área" value={employee?.department} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Datos de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Correo personal" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Contacto de emergencia" value={form.emergency_contact} onChange={(v) => setForm({ ...form, emergency_contact: v })} />
          <Field label="Teléfono de emergencia" value={form.emergency_phone} onChange={(v) => setForm({ ...form, emergency_phone: v })} />
        </div>
        <div className="flex justify-end">
          <Button disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>
      </Card>
    </EmployeePortalLayout>
  );
}

function ReadOnly({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
