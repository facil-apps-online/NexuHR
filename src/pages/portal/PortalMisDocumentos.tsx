import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { usePortalSlug } from '@/hooks/usePortalSlug';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileImage, FileText, File, Eye, Inbox, PenTool } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnifiedPdfViewer } from '@/components/pdf/UnifiedPdfViewer';

interface Attachment {
  id: string;
  url: string;
  fileName: string;
  type: 'evidence' | 'signature';
  module: string;
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

export default function PortalMisDocumentos() {
  const { employee } = useEmployeePortalAuth();
  const { basePath } = usePortalSlug();
  const eid = employee?.id;
  const tenantId = employee?.tenant_id;
  const [moduleFilter, setModuleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'evidence' | 'signature'>('all');
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['portal-my-documents', eid],
    enabled: !!eid,
    queryFn: async () => {
      if (!eid) return [];

      const items: Attachment[] = [];

      const modules = ['dotacion', 'eventos', 'reglamento', 'evaluaciones', 'examenes', 'incapacidades', 'cursos', 'vigilancias', 'activos_fijos'];

      for (const mod of modules) {
        const modulesToFetch = mod === 'reglamento' ? ['reglamento', 'reglamentos'] : [mod];

        const { data: sigs } = await portalSupabase
          .from('signatures' as any)
          .select('signature_url, created_at')
          .eq('employee_id', eid)
          .in('module', modulesToFetch);

        (sigs || []).forEach((s: any, idx: number) => {
          if (s.signature_url) {
            items.push({
              id: `sig-${mod}-${idx}`,
              url: s.signature_url,
              fileName: `Firma - ${moduleLabels[mod] || mod}`,
              type: 'signature',
              module: mod,
              created_at: s.created_at,
            });
          }
        });

        const { data: evs } = await portalSupabase
          .from('evidences')
          .select('file_url, file_name, created_at')
          .eq('employee_id', eid)
          .in('module', modulesToFetch);

        (evs || []).forEach((e: any, idx: number) => {
          if (e.file_url) {
            items.push({
              id: `ev-${mod}-${idx}`,
              url: e.file_url,
              fileName: e.file_name || `Evidencia - ${moduleLabels[mod] || mod}`,
              type: 'evidence',
              module: mod,
              created_at: e.created_at,
            });
          }
        });
      }

      return items.sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });

  const filtered = attachments.filter((a) => {
    const matchesModule = moduleFilter === 'all' || a.module === moduleFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesModule && matchesType;
  });

  const availableModules = [...new Set(attachments.map((a) => a.module))];

  const getFileIcon = (type: string) => {
    if (type === 'signature') return <PenTool className="h-4 w-4" />;
    return <FileImage className="h-4 w-4" />;
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis documentos</h1>
      <p className="text-muted-foreground">Todas tus evidencias y firmas en un solo lugar.</p>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {availableModules.map((m) => (
                  <SelectItem key={m} value={m}>{moduleLabels[m] || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v: 'all' | 'evidence' | 'signature') => setTypeFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="evidence">Evidencias</SelectItem>
                <SelectItem value="signature">Firmas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando documentos...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay documentos</h3>
            <p className="text-sm text-muted-foreground">
              {moduleFilter !== 'all' || typeFilter !== 'all'
                ? 'No se encontraron con los filtros seleccionados'
                : 'Aún no has subido evidencias ni firmado documentos'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
              onClick={() => setPreviewItem(item)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${item.type === 'signature' ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {getFileIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleLabels[item.module] || item.module}
                    {item.created_at && ` · ${new Date(item.created_at).toLocaleDateString('es-CO')}`}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 ml-2">
                {item.type === 'signature' ? 'Firma' : 'Evidencia'}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none h-[90vh]">
          <div className="bg-background rounded-lg overflow-hidden flex flex-col items-center justify-center p-4 relative w-full h-full">
            {previewItem && (
              <>
                <p className="text-sm font-medium mb-4 text-center">{previewItem.fileName}</p>
                {previewItem.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                  <img src={previewItem.url} alt={previewItem.fileName} className="max-w-full max-h-full object-contain rounded" />
                ) : previewItem.url.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full flex-1 min-h-0">
                    <UnifiedPdfViewer url={previewItem.url} className="h-full" />
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                    <a href={previewItem.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                      Abrir archivo en nueva pestaña
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </EmployeePortalLayout>
  );
}
