import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { coreSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle2, XCircle, Globe, Key, PowerOff } from 'lucide-react';

export function EmailConfigurationSettings() {
  const { currentAssignment, tenantId } = useAuth();
  const platformId = currentAssignment?.platform_id;

  const [mode, setMode] = useState<'google' | 'smtp'>('google');
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: gmailIntegration, refetch: refetchGmail } = useQuery({
    queryKey: ['gmail-integration', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await coreSupabase.functions.invoke('core-actions', {
        body: { action: 'get_tenant_integration', payload: { tenantId, provider: 'google_gmail' } },
      });
      if (error) throw new Error(error.message);
      return data as { id: string; account_email: string; is_active: boolean } | null;
    },
    enabled: !!tenantId,
  });

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, provider, accountEmail, error } = event.data;
      if (type === 'auth-success' && provider === 'google_gmail') {
        toast.success('Cuenta de Gmail conectada exitosamente');
        refetchGmail();
      } else if (type === 'auth-error' && provider === 'google_gmail') {
        toast.error(error || 'Error al conectar con Gmail');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchGmail]);

  const handleGoogleConnect = async () => {
    if (!tenantId || !platformId) return toast.error('Tenant no disponible');
    setIsConnecting(true);
    try {
      const finalRedirectUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await coreSupabase.functions.invoke('core-actions', {
        body: {
          action: 'get-google-auth-url',
          payload: { tenantId, provider: 'google_gmail', finalRedirectUrl },
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.authUrl) throw new Error('No se pudo obtener la URL de autenticación');
      const width = 600, height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(data.authUrl, 'googleAuth', `width=${width},height=${height},top=${top},left=${left}`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al conectar con Gmail');
    } finally {
      setIsConnecting(false);
    }
  };

  const saveSmtp = useMutation({
    mutationFn: async () => {
      if (!tenantId || !platformId) throw new Error('Tenant no disponible');
      const { error } = await coreSupabase.functions.invoke('core-actions', {
        body: {
          action: 'upsert_tenant_integration',
          payload: {
            tenantId, platformId, provider: 'smtp',
            credentials: { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from: smtpFrom },
            environment: 'production',
          },
        },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success('Configuración SMTP guardada'),
    onError: (err: any) => toast.error(err?.message || 'Error al guardar'),
  });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Configuración de Correo</h2>
          <p className="text-sm text-muted-foreground">
            {gmailIntegration ? `Conectado como ${gmailIntegration.account_email}` : 'Sin conexión configurada'}
          </p>
        </div>
        {gmailIntegration?.is_active ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground ml-auto" />
        )}
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'google' | 'smtp')}>
        <TabsList>
          <TabsTrigger value="google" className="gap-2">
            <Globe className="h-4 w-4" /> Google Gmail
          </TabsTrigger>
          <TabsTrigger value="smtp" className="gap-2">
            <Key className="h-4 w-4" /> SMTP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Conecta una cuenta de Gmail para enviar correos desde tu dominio.
          </p>
          {gmailIntegration ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Conectado como {gmailIntegration.account_email}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={async () => {
                try {
                  await coreSupabase.functions.invoke('core-actions', {
                    body: { action: 'delete_tenant_integration', payload: { tenantId, provider: 'google_gmail' } },
                  });
                  toast.success('Integración de Gmail desconectada');
                  refetchGmail();
                } catch (err: any) {
                  toast.error(err?.message || 'Error al desconectar');
                }
              }}>
                <PowerOff className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            </div>
          ) : (
            <Button onClick={handleGoogleConnect} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
              Conectar con Gmail
            </Button>
          )}
        </TabsContent>

        <TabsContent value="smtp" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Servidor SMTP</Label>
              <Input id="smtp-host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input id="smtp-port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Usuario</Label>
              <Input id="smtp-user" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="correo@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Contraseña</Label>
              <Input id="smtp-pass" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-from">Correo remitente</Label>
              <Input id="smtp-from" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="notificaciones@empresa.com" />
            </div>
          </div>
          <Button onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending || !smtpHost || !smtpFrom}>
            {saveSmtp.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Guardar configuración SMTP
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
