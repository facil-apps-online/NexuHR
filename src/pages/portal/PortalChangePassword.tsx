import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function PortalChangePassword() {
  const navigate = useNavigate();
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const { account, refresh, signOut, updateAccount } = useEmployeePortalAuth();
  const slug = portalSlug || 'Funcionarios';
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd1.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (pwd1 !== pwd2) { toast.error('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const { error } = await portalSupabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      if (account?.id) {
        await portalSupabase.from('employee_portal_accounts').update({ must_change_password: false }).eq('id', account.id);
        updateAccount({ must_change_password: false });
      }
      await refresh();
      toast.success('Contraseña actualizada');
      setTimeout(() => navigate(`/${slug}/inicio`, { replace: true }), 0);
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 text-[16px]">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Cambia tu contraseña</h1>
          <p className="text-muted-foreground">Por seguridad, debes definir una contraseña nueva antes de continuar.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p1">Nueva contraseña</Label>
            <Input id="p1" type="password" value={pwd1} onChange={(e) => setPwd1(e.target.value)} className="h-12" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p2">Confirmar contraseña</Label>
            <Input id="p2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="h-12" required />
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar contraseña'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={async () => { await signOut(); navigate(`/${slug}`); }}>
            Cancelar y salir
          </Button>
        </form>
      </Card>
    </div>
  );
}
