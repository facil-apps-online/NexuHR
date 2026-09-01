import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const { user, account, loading: authLoading } = useEmployeePortalAuth();
  const slug = portalSlug || 'Funcionarios';
  const [documento, setDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-by-portal-slug', slug],
    queryFn: async () => {
      if (!slug || slug === 'Funcionarios') return null;
      const { data } = await supabase.rpc('get_tenant_by_portal_slug', { p_slug: slug });
      const row = Array.isArray(data) ? data[0] : data;
      return row as { tenant_id: string; logo_url: string | null; tenant_name: string } | null;
    },
    enabled: !!slug && slug !== 'Funcionarios',
  });

  const { displayUrl: logoSrc } = useGoogleDriveImage(tenantInfo?.logo_url || undefined, tenantInfo?.tenant_id);

  useEffect(() => {
    if (!authLoading && user && account?.status === 'active') {
      navigate(account.must_change_password ? `/${slug}/cambiar-clave` : `/${slug}/inicio`, { replace: true });
    }
  }, [authLoading, user, account, navigate, slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento || !password) return;
    setLoading(true);
    try {
      // Resolve synthetic email via public RPC (use anon admin client to avoid touching portal session)
      const { data, error } = await supabase.rpc('resolve_employee_login', { p_documento: documento.trim() });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.synthetic_email) {
        toast.error('Documento no encontrado o sin acceso al portal.');
        setLoading(false);
        return;
      }
      const { error: signErr } = await portalSupabase.auth.signInWithPassword({
        email: row.synthetic_email,
        password,
      });
      if (signErr) {
        toast.error('Documento o contraseña incorrectos.');
        setLoading(false);
        return;
      }
      // Update last_login_at (best-effort)
      await portalSupabase.from('employee_portal_accounts').update({ last_login_at: new Date().toISOString() }).eq('synthetic_email', row.synthetic_email);
      toast.success('Bienvenido');
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-3">
          {logoSrc && (
            <div className="flex justify-center mb-2">
              <img src={logoSrc} alt={tenantInfo?.tenant_name || 'Logo'} className="h-12 w-auto max-w-[180px] object-contain" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{tenantInfo?.tenant_name || 'Portal del Empleado'}</h1>
          <p className="text-muted-foreground">Ingresa con tu número de documento</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc" className="text-base">Número de documento</Label>
            <Input
              id="doc"
              inputMode="numeric"
              autoComplete="username"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="h-12 text-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd" className="text-base">Contraseña</Label>
            <Input
              id="pwd"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-lg"
              required
            />
            <p className="text-sm text-muted-foreground">
              Si ingresas por primera vez, tu contraseña es tu número de documento.
            </p>
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
