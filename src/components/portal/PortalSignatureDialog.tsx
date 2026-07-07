import { useMutation } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { coreSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/firmas/SignatureCanvas';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  recordId: string;
  /** Optional: target table+column to update with the signature URL */
  updateTarget?: { table: 'dotacion' | 'event_participants' | 'regulation_acknowledgments' | 'evaluations' | 'exams' | 'courses'; column: string; extra?: Record<string, any> };
  onSuccess?: () => void;
}

export function PortalSignatureDialog({ open, onOpenChange, module, recordId, updateTarget, onSuccess }: Props) {
  const { employee, account, user } = useEmployeePortalAuth();

  const save = useMutation({
    mutationFn: async (dataUrl: string) => {
      if (!employee || !account || !user) throw new Error('Sesión inválida');
      
      const base64data = dataUrl.split(',')[1];
      const fileSize = Math.round((base64data.length * 3) / 4); // Calculate file size in bytes

      const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
        body: {
          platform_id: import.meta.env.VITE_PLATFORM_ID,
          tenantId: account.tenant_id,
          fileName: `signature_${employee.id}_${Date.now()}.png`,
          fileBase64: base64data,
          mimeType: 'image/png',
          path_components: ['Soportes', 'Firmas', module, recordId],
        },
      });

      if (uploadError || !uploadData?.success) throw new Error(uploadError?.message || 'Error en Google Drive');
      if (!uploadData?.fileId) throw new Error('No se pudo obtener el ID del archivo en Google Drive');

      const filePath = `https://drive.google.com/uc?id=${uploadData.fileId}`;

      const watermark = `Firmado el ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: es })}`;
      const { error: insErr } = await portalSupabase.from('signatures' as any).insert({
        tenant_id: account.tenant_id,
        module,
        record_id: recordId,
        employee_id: employee.id,
        signed_by: user.id,
        signature_url: filePath,
        watermark_text: watermark,
        method: 'canvas',
        file_size: fileSize,
      });
      if (insErr) throw insErr;

      if (updateTarget) {
        const patch: Record<string, any> = { [updateTarget.column]: filePath, ...(updateTarget.extra || {}) };
        await portalSupabase.from(updateTarget.table as any).update(patch).eq('id', recordId);
      }
    },
    onSuccess: () => {
      toast.success('Firma registrada');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo firmar'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Firma electrónica</DialogTitle>
          <DialogDescription>Dibuja tu firma. Quedará registrada con la fecha y hora actuales.</DialogDescription>
        </DialogHeader>
        <SignatureCanvas
          employeeName={`${employee?.first_name ?? ''} ${employee?.last_name ?? ''}`}
          isSaving={save.isPending}
          onCancel={() => onOpenChange(false)}
          onSave={(d) => save.mutate(d)}
        />
      </DialogContent>
    </Dialog>
  );
}
