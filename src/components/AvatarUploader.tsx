import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, coreSupabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';

interface AvatarUploaderProps {
  size?: 'sm' | 'md' | 'lg';
  initialAvatarUrl?: string | null;
}

export const AvatarUploader = React.memo(({
  size = 'md',
  initialAvatarUrl,
}: AvatarUploaderProps) => {
  const avatarSizeClasses = { sm: 'h-12 w-12', md: 'h-20 w-20', lg: 'h-32 w-32' };
  const currentAvatarSizeClass = avatarSizeClasses[size];
  const { user, profile, currentAssignment, refreshUser, updateProfileAvatar } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isCropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl); };
  }, [croppedPreviewUrl]);

  const { displayUrl: userAvatarDisplayUrl } = useGoogleDriveImage(initialAvatarUrl);

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
    if (!croppedImage || !user || !currentAssignment || !profile) return;
    
    setIsSaving(true);
    try {
      const base64data = await readFileAsBase64(croppedImage);

      // 1. Call the GENERIC 'google-drive-upload' function in the CORE project
      const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
        body: { 
          platform_id: import.meta.env.VITE_PLATFORM_ID,
          tenantId: currentAssignment.tenant_id,
          fileName: `avatar_${user.id}.png`, 
          fileBase64: base64data, 
          mimeType: 'image/png', 
          path_components: ['Avatars', user.id],
        }
      });

      if (uploadError || !uploadData.success) {
        throw new Error(uploadError?.message || uploadData.error || 'Error al subir la imagen a Google Drive.');
      }

      // 2. Call the TENANT-SPECIFIC 'user-actions' function to update the user's profile
      const payload = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        avatar_url: uploadData.fileId,
      };

      const { data: updateData, error: updateError } = await supabase.functions.invoke('user-actions', {
        body: {
          action: 'update-user-settings',
          payload: { userId: user.id, metadata: payload },
        },
      });

      if (updateError) throw updateError;
      if (!updateData.success) throw new Error(updateData.message);

      // 3. If an old avatar was replaced, call the GENERIC 'google-drive-delete' in CORE
      if (updateData.oldAvatarFileId) {
        const { error: deleteError } = await coreSupabase.functions.invoke('google-drive-delete', {
          body: { 
            fileId: updateData.oldAvatarFileId, 
            platform_id: import.meta.env.VITE_PLATFORM_ID
          }
        });
        if (deleteError) {
          console.error('Error deleting old avatar from Google Drive:', deleteError.message);
        }
      }

      toast({ title: 'Éxito', description: 'Avatar actualizado correctamente.', variant: 'success' });
      updateProfileAvatar(uploadData.fileId);
      await refreshUser();
      setCroppedPreviewUrl(null);
      setCroppedImage(null);

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (profile?.firstName) return `${profile.firstName[0]}${profile.lastName ? profile.lastName[0] : ''}`.toUpperCase();
    return user?.email?.[0].toUpperCase() || '?';
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <Avatar className={currentAvatarSizeClass}>
          <AvatarImage src={croppedPreviewUrl || userAvatarDisplayUrl} alt="Avatar" />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="space-y-2 flex flex-col items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" onClick={(e) => { (e.target as HTMLInputElement).value = '' }} />
          {/* CORRECCIÓN: Añadir type="button" para evitar el envío del formulario */}
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>Cambiar Avatar</Button>
          {croppedPreviewUrl && (
            <div className="flex gap-2">
              {/* CORRECCIÓN: Añadir type="button" para evitar el envío del formulario */}
              <Button type="button" onClick={handleUploadAndSave} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      </div>
      <ImageCropDialog isOpen={isCropDialogOpen} onClose={() => setCropDialogOpen(false)} imageSrc={sourceImage} onCropComplete={handleCropComplete} />
    </>
  );
});