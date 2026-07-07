import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coreSupabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignatureCanvas } from "./SignatureCanvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  recordId: string;
  employeeId: string;
  employeeName: string;
  tenantId: string;
  onSuccess?: () => void;
}

export function SignatureDialog({
  open,
  onOpenChange,
  module,
  recordId,
  employeeId,
  employeeName,
  tenantId,
  onSuccess,
}: SignatureDialogProps) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Convert data URL to base64
      const base64data = dataUrl.split(",")[1];
      const fileSize = Math.round((base64data.length * 3) / 4);

      // Upload to Google Drive using core edge function
      const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke("google-drive-upload", {
        body: {
          platform_id: import.meta.env.VITE_PLATFORM_ID,
          tenantId: tenantId,
          fileName: `signature_${employeeId}_${Date.now()}.png`,
          fileBase64: base64data,
          mimeType: "image/png",
          path_components: ["Soportes", "Firmas", module, recordId],
        },
      });

      if (uploadError || !uploadData?.success) throw new Error(uploadError?.message || "Error en Google Drive");
      if (!uploadData?.fileId) throw new Error("No se pudo obtener el ID del archivo en Google Drive");

      const filePath = `https://drive.google.com/uc?id=${uploadData.fileId}`;

      const now = new Date();
      const watermark = `Firmado el ${format(now, "dd/MM/yyyy HH:mm:ss", { locale: es })}`;

      // Save signature record
      const { error: insertError } = await supabase
        .from("signatures" as any)
        .insert({
          tenant_id: tenantId,
          module,
          record_id: recordId,
          employee_id: employeeId,
          signed_by: user.id,
          signature_url: filePath,
          file_size: fileSize,
          watermark_text: watermark,
          method: "canvas",
        });
      if (insertError) throw insertError;

    },
    onSuccess: () => {
      toast.success("Firma registrada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["signatures"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
      queryClient.invalidateQueries({ queryKey: ["dotacion-pending-signatures"] });
      queryClient.invalidateQueries({ queryKey: ["pending-signatures"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => toast.error("Error al guardar firma: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Firma Digital</DialogTitle>
          <DialogDescription>
            {employeeName} — {module === "eventos" ? "Evento" : module === "dotacion" ? "Dotación" : module}
          </DialogDescription>
        </DialogHeader>
        <SignatureCanvas
          employeeName={employeeName}
          isSaving={saveMutation.isPending}
          onSave={(dataUrl) => saveMutation.mutate(dataUrl)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
