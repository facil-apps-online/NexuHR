import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, File, Eye, Loader2, Inbox } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnifiedPdfViewer } from '@/components/pdf/UnifiedPdfViewer';

interface EmpleadoDocumentosProps {
  employeeId: string;
}

interface Evidence {
  id: string;
  module: string;
  record_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_by_employee_id: string | null;
  created_at: string | null;
}

const moduleLabels: Record<string, string> = {
  dotacion: 'Dotación',
  eventos: 'Eventos',
  reglamento: 'Reglamento',
  evaluaciones: 'Evaluaciones',
  examenes: 'Exámenes',
  incapacidades: 'Incapacidades',
  cursos: 'Cursos',
  vigilancias: 'Vigilancias',
  activos_fijos: 'Activos Fijos',
};

export function EmpleadoDocumentos({ employeeId }: EmpleadoDocumentosProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: evidences = [], isLoading } = useQuery({
    queryKey: ['employee-evidences', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidences')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Evidence[];
    },
    enabled: !!employeeId,
  });

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5 text-primary" />
          Documentos y evidencias del empleado
          {evidences.length > 0 && (
            <Badge className="bg-success/10 text-success border-success/20">
              {evidences.length} archivo{evidences.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {evidences.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Este empleado no ha subido evidencias aún.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {evidences.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(ev.file_type)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{ev.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {moduleLabels[ev.module] || ev.module}
                      {ev.created_at && ` · ${new Date(ev.created_at).toLocaleDateString('es-CO')}`}
                      {ev.file_size && ` · ${formatSize(ev.file_size)}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPreviewUrl(ev.file_url)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center p-4">
              {previewUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                <img src={previewUrl} alt="Evidencia" className="max-w-full max-h-96 rounded-lg border" />
              ) : previewUrl.toLowerCase().endsWith('.pdf') ? (
                <UnifiedPdfViewer url={previewUrl} className="w-full h-[70vh]" />
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                    Abrir archivo en nueva pestaña
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
