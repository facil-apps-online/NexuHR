import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { KeyRound, ShieldOff, UserPlus, RotateCw, Loader2 } from 'lucide-react';

interface Props { employeeId: string; documentNumber: string; }

type Action = null | 'create' | 'reset' | 'revoke';

export function PortalAccountActions({ employeeId, documentNumber }: Props) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Action>(null);
  const [busy, setBusy] = useState(false);

  const { data: account } = useQuery({
    queryKey: ['portal-account', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_portal_accounts')
        .select('id, status, must_change_password, last_login_at, activated_at, revoked_at')
        .eq('employee_id', employeeId)
        .maybeSingle();
      return data;
    },
  });

  const invoke = async (fn: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { employee_id: employeeId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success((data as any)?.message || 'Listo');
      qc.invalidateQueries({ queryKey: ['portal-account', employeeId] });
      qc.invalidateQueries({ queryKey: ['portal-accounts-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const hasAccount = !!account;
  const isActive = account?.status === 'active';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!isActive && (
          <Button size="sm" onClick={() => setPending('create')} disabled={busy}>
            {hasAccount ? <><RotateCw className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Reactivar</span></> : <><UserPlus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Activar</span></>}
          </Button>
        )}
        {isActive && (
          <>
            <Button size="sm" variant="outline" onClick={() => setPending('reset')} disabled={busy}>
              <KeyRound className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Resetear clave</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setPending('revoke')} disabled={busy}>
              <ShieldOff className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Revocar</span>
            </Button>
          </>
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin self-center" />}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'create' && (hasAccount ? 'Reactivar acceso al portal' : 'Activar acceso al portal')}
              {pending === 'reset' && 'Resetear contraseña'}
              {pending === 'revoke' && 'Revocar acceso al portal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'create' && <>Se creará la cuenta con usuario <b>{documentNumber}</b> y contraseña <b>{documentNumber}</b>. El empleado deberá cambiarla al ingresar.</>}
              {pending === 'reset' && <>La contraseña se restablecerá a <b>{documentNumber}</b>. El empleado deberá cambiarla en su próximo ingreso.</>}
              {pending === 'revoke' && <>Se eliminará el usuario y el empleado no podrá ingresar más al portal hasta que vuelvas a activarlo.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pending === 'create') invoke('portal-account-create');
              else if (pending === 'reset') invoke('portal-account-reset-password');
              else if (pending === 'revoke') invoke('portal-account-revoke');
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
