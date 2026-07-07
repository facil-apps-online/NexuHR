import { useState, useRef, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { coreSupabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  supabase: SupabaseClient;
  employeeId: string;
  tenantId: string;
  platformId: string;
  currentPhotoUrl?: string | null;
  employeeName: string;
  onPhotoUpdated: (newFileId: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function EmployeePhotoUpload({
  supabase,
  employeeId,
  tenantId,
  platformId,
  currentPhotoUrl,
  employeeName,
  onPhotoUpdated,
  size = 'lg',
}: Props) {
  const avatarSizeClasses = { sm: 'h-12 w-12', md: 'h-20 w-20', lg: 'h-32 w-32' };
  const [isSaving, setIsSaving] = useState(false);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isCropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { displayUrl: photoDisplayUrl } = useGoogleDriveImage(currentPhotoUrl || undefined, tenantId);

  // Keep the cropped preview visible until the new image loads from the proxy
  useEffect(() => {
    if (pendingFileId && currentPhotoUrl === pendingFileId && photoDisplayUrl) {
      setCroppedPreviewUrl(null);
      setCroppedImage(null);
      setPendingFileId(null);
    }
  }, [currentPhotoUrl, pendingFileId, photoDisplayUrl]);

  const initials = employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedImage(blob);
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(URL.createObjectURL(blob));
  };

  const readFileAsBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = (error) => reject(error);
  });

  const handleUploadAndSave = async () => {
    if (!croppedImage) return;

    setIsSaving(true);
    try {
      const base64data = await readFileAsBase64(croppedImage);

      // 1. Upload to Google Drive
      const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
        body: {
          platform_id: platformId,
          tenantId,
          fileName: `photo_${employeeId}.png`,
          fileBase64: base64data,
          mimeType: 'image/png',
          path_components: ['Fotos Empleados'],
        },
      });

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || uploadData?.error || 'Error al subir la imagen');
      }

      const newFileId: string = uploadData.fileId;

      // 2. Get old photo record to clean up later
      const { data: oldPhoto } = await supabase
        .from('employee_photos')
        .select('google_drive_file_id')
        .eq('employee_id', employeeId)
        .eq('tenant_id', tenantId)
        .eq('platform_id', platformId)
        .maybeSingle();

      const oldFileId = oldPhoto?.google_drive_file_id;

      // 3. Upsert the tracking record (unique on employee+tenant+platform replaces old one)
      const { error: upsertError } = await supabase
        .from('employee_photos')
        .upsert({
          employee_id: employeeId,
          tenant_id: tenantId,
          platform_id: platformId,
          google_drive_file_id: newFileId,
          file_name: `photo_${employeeId}.png`,
          file_size: croppedImage.size,
          mime_type: 'image/png',
        }, { onConflict: 'employee_id, tenant_id, platform_id' });

      if (upsertError) throw upsertError;

      // 4. Update employees.photo_url and photo_size with the new file ID
      const { error: updateError } = await supabase
        .from('employees')
        .update({ photo_url: newFileId, photo_size: croppedImage.size })
        .eq('id', employeeId);

      if (updateError) throw updateError;

      // 5. Delete old Google Drive file if it exists and changed
      if (oldFileId && oldFileId !== newFileId) {
        coreSupabase.functions.invoke('google-drive-delete', {
          body: { fileId: oldFileId, platform_id: platformId },
        }).catch(err => console.error('Error deleting old photo:', err));
      }

      toast.success('Foto actualizada correctamente');
      setPendingFileId(newFileId);
      onPhotoUpdated(newFileId);

    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la foto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <Avatar className={avatarSizeClasses[size]}>
          <AvatarImage src={croppedPreviewUrl || photoDisplayUrl} alt="Foto" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-2 flex flex-col items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg"
            className="hidden"
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          />
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving} variant="outline" size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cambiar foto'}
          </Button>
          {croppedPreviewUrl && (
            <Button type="button" onClick={handleUploadAndSave} disabled={isSaving} size="sm">
              {isSaving ? 'Guardando...' : 'Guardar foto'}
            </Button>
          )}
        </div>
      </div>
      <ImageCropDialog
        isOpen={isCropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={sourceImage}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
