import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOcr } from '@/hooks/useOcr';

interface PhotoToPdfDialogProps {
  onFilesReady: (files: File[]) => void;
  trigger?: React.ReactNode;
}

interface PhotoEntry {
  file: File;
  preview: string;
  ocrText?: string;
}

export function PhotoToPdfDialog({ onFilesReady, trigger }: PhotoToPdfDialogProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { ocrImage } = useOcr();

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const newPhotos: PhotoEntry[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleOcrAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const updated = await Promise.all(
        photos.map(async (photo) => {
          if (photo.ocrText) return photo;
          try {
            const text = await ocrImage(photo.file);
            return { ...photo, ocrText: text };
          } catch {
            return photo;
          }
        })
      );
      setPhotos(updated);
      toast.success('OCR completado', { description: 'Texto extraído de todas las imágenes' });
    } finally {
      setIsProcessing(false);
    }
  }, [photos, ocrImage]);

  const handleConfirm = useCallback(() => {
    if (photos.length === 0) return;
    onFilesReady(photos.map(p => p.file));
    setPhotos([]);
    setOpen(false);
    toast.success(`${photos.length} imagen${photos.length > 1 ? 'es' : ''} lista${photos.length > 1 ? 's' : ''}`);
  }, [photos, onFilesReady]);

  const handleClose = useCallback(() => {
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setOpen(false);
  }, [photos]);

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      {trigger || (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Camera className="h-4 w-4 mr-1" />
            Foto → PDF
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Foto → PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-1" />
              Cámara
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Galería
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          {photos.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <Label>{photos.length} imagen{photos.length > 1 ? 'es' : ''}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={handleOcrAll}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  OCR a todas
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group rounded border overflow-hidden">
                    <img src={photo.preview} alt="" className="w-full h-24 object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {photo.ocrText && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                        OCR ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleConfirm}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar {photos.length} imagen{photos.length > 1 ? 'es' : ''} al upload
              </Button>
            </>
          )}

          {photos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Toma una foto o selecciona imágenes para convertir a PDF con OCR
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
