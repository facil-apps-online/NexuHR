import { useState } from 'react';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { coreSupabase } from '@/lib/supabaseClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Upload, Camera } from 'lucide-react';
import { PhotoToPdfDialog } from '@/components/pdf/PhotoToPdfDialog';
import { OcrProcessor } from '@/components/pdf/OcrProcessor';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
  module: string;            // e.g. 'cursos' | 'examenes' | 'dotacion' | 'incapacidades'
  recordId: string;          // FK to the parent record
  bucket?: string;           // storage bucket, default 'evidences'
  onUploaded?: () => void;
  buttonLabel?: string;
}

export function PortalEvidenceUpload({ module, recordId, bucket = 'evidences', onUploaded, buttonLabel = 'Adjuntar soporte' }: Props) {
  const { employee } = useEmployeePortalAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const [extraFiles, setExtraFiles] = useState<File[]>([]);

  const reset = () => { setFile(null); setDescription(''); setExtraFiles([]); };

  const allFiles = file ? [file, ...extraFiles] : extraFiles;

  const handleUpload = async () => {
    if (allFiles.length === 0 || !employee) return;
    setUploading(true);
    try {
      for (const uploadFile of allFiles) {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(uploadFile);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = error => reject(error);
        });

        const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
          body: {
            platform_id: import.meta.env.VITE_PLATFORM_ID,
            tenantId: employee.tenant_id,
            fileName: `${Date.now()}_${uploadFile.name}`,
            fileBase64: base64data,
            mimeType: uploadFile.type || "application/octet-stream",
            path_components: ['Soportes', 'Evidencias', module, recordId]
          }
        });

        if (uploadError || !uploadData?.success) throw new Error(uploadError?.message || uploadData?.error || "Error al subir evidencia");
        const filePath = `https://drive.google.com/uc?id=${uploadData.fileId}`;

        const { error: insErr } = await portalSupabase.from('evidences').insert({
          tenant_id: employee.tenant_id,
          module,
          record_id: recordId,
          employee_id: employee.id,
          uploaded_by_employee_id: employee.id,
          file_url: filePath,
          file_name: uploadFile.name,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          description: description || null,
        } as any);
        if (insErr) throw insErr;
      }

      toast.success('Soporte cargado correctamente');
      reset(); setOpen(false);
      onUploaded?.();
    } catch (e: any) {
      toast.error('No se pudo cargar el archivo: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Paperclip className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjuntar soporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="evid-file">Archivo (PDF, imagen)</Label>
              <Input
                id="evid-file"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <PhotoToPdfDialog
              onFilesReady={(files) => setExtraFiles(prev => [...prev, ...files])}
              trigger={
                <Button variant="outline" size="sm" className="mt-5 h-10">
                  <Camera className="h-4 w-4 mr-1" />
                  Foto → PDF
                </Button>
              }
            />
          </div>
          {extraFiles.length > 0 && (
            <div className="text-xs text-muted-foreground">
              +{extraFiles.length} archivo{extraFiles.length > 1 ? 's' : ''} desde cámara/galería
            </div>
          )}
          {file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && (
            <OcrProcessor file={file} />
          )}
          <div>
            <Label htmlFor="evid-desc">Descripción (opcional)</Label>
            <Textarea
              id="evid-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Certificado externo, foto del elemento recibido…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={allFiles.length === 0 || uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Cargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
