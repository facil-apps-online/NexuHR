import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { useReportApi } from '@/hooks/useReportApi';
import { useReportingIntegration } from '@/hooks/useReportingIntegration';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateKey?: string;
  onSave?: (templateKey: string) => void;
}

export function ReportDesignerDialog({ open, onOpenChange, templateKey, onSave }: Props) {
  const [templateName, setTemplateName] = useState(templateKey || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: integration } = useReportingIntegration();

  const { saveTemplate, loading } = useReportApi({
    apiUrl: integration?.apiUrl || "",
    apiKey: integration?.apiKey || "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.repx')) {
        toast.error('Solo se permiten archivos .repx');
        return;
      }
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace('.repx', ''));
      }
    }
  };

  const handleSave = async () => {
    if (!templateName) {
      toast.error('Ingresa un nombre para la plantilla');
      return;
    }

    if (!selectedFile) {
      toast.error('Selecciona un archivo .repx');
      return;
    }

    if (!integration?.apiKey) {
      toast.error('Reporting API no está configurada. Ve a Configuración → Integraciones.');
      return;
    }

    try {
      // Read file as base64
      const buffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      await saveTemplate({
        templateKey: templateName.replace(/\s+/g, '-').toLowerCase(),
        repxBase64: base64,
        description: `Uploaded from ${selectedFile.name}`,
      });

      setSaved(true);
      toast.success('Plantilla guardada exitosamente');
      onSave?.(templateName);
      
      setTimeout(() => {
        onOpenChange(false);
        setSaved(false);
        setSelectedFile(null);
        setTemplateName('');
      }, 1500);
    } catch (error) {
      toast.error('Error al guardar la plantilla');
    }
  };

  const handleDownload = async () => {
    if (!templateName || !integration?.apiKey) return;

    try {
      const response = await fetch(`${integration.apiUrl}/api/templates/repx/${templateName}`, {
        headers: { 'X-API-Key': integration.apiKey },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateName}.repx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Plantilla descargada');
      } else {
        toast.error('Plantilla no encontrada');
      }
    } catch {
      toast.error('Error al descargar plantilla');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Plantilla</DialogTitle>
          <DialogDescription>
            Sube un archivo .repx para generar documentos con formato profesional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre de la Plantilla</Label>
            <Input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="ej: certificado-laboral"
            />
          </div>

          <div className="space-y-2">
            <Label>Archivo .repx</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".repx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <FileText className="h-5 w-5" />
                  <span>{selectedFile.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo .repx o haz clic para seleccionar
                  </p>
                </div>
              )}
            </div>
          </div>

          {!integration?.apiKey && (
            <div className="border rounded-lg p-3 bg-destructive/10 text-sm text-destructive">
              Reporting API no está configurada. Ve a Configuración → Integraciones.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={!templateName || !integration?.apiKey}>
            Descargar
          </Button>
          <Button onClick={handleSave} disabled={loading || !templateName || !selectedFile || !integration?.apiKey}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {saved ? 'Guardado' : 'Subir Plantilla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
