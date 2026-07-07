import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

import { FileText } from 'lucide-react';

interface AttachmentItemProps {
  url: string;
  type: 'signature' | 'evidence';
  fileName?: string;
  tenantId?: string;
}

function AttachmentItem({ url, type, fileName, tenantId }: AttachmentItemProps) {
  const { displayUrl, mimeType } = useGoogleDriveImage(url, tenantId);

  if (!displayUrl) return null;

  const isPdf = mimeType === 'application/pdf' || url.toLowerCase().endsWith('.pdf');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-md border bg-muted/50 overflow-hidden cursor-zoom-in transition-all hover:ring-2 hover:ring-primary/50 flex items-center justify-center">
          {isPdf ? (
            <FileText className="h-8 w-8 text-muted-foreground" />
          ) : (
            <img 
              src={displayUrl} 
              alt={type === 'signature' ? 'Firma' : 'Evidencia'} 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium text-center p-1">
            {type === 'signature' ? 'Ver firma' : 'Ver archivo'}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none h-[90vh]">
        <div className="bg-background rounded-lg overflow-hidden flex flex-col items-center justify-center p-4 relative w-full h-full">
          {fileName && <p className="text-sm font-medium mb-4 text-center">{fileName}</p>}
          {isPdf ? (
            <iframe src={displayUrl} className="w-full flex-1 rounded" />
          ) : (
            <img 
              src={displayUrl} 
              alt={type === 'signature' ? 'Firma ampliada' : 'Evidencia ampliada'} 
              className="max-w-full max-h-full object-contain rounded"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  module: string;
  recordId: string;
  extraItems?: Array<{ id: string; url: string; type: 'signature' | 'evidence'; fileName?: string }>;
}

export function PortalRecordAttachments({ module, recordId, extraItems = [] }: Props) {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const tenantId = employee?.tenant_id;

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['portal-attachments', module, recordId, eid],
    enabled: !!eid && !!recordId,
    queryFn: async () => {
      const modulesToFetch = module === 'reglamento' ? ['reglamento', 'reglamentos'] : [module];

      // Fetch signatures
      const { data: sigs } = await portalSupabase
        .from('signatures' as any)
        .select('signature_url')
        .eq('employee_id', eid!)
        .eq('record_id', recordId)
        .in('module', modulesToFetch);

      // Fetch evidences
      const { data: evs } = await portalSupabase
        .from('evidences')
        .select('file_url, file_name')
        .eq('employee_id', eid!)
        .eq('record_id', recordId)
        .in('module', modulesToFetch);

      const items: Array<{ id: string; url: string; type: 'signature' | 'evidence'; fileName?: string }> = [];

      (sigs || []).forEach((s: any, idx: number) => {
        if (s.signature_url) items.push({ id: `sig-${idx}`, url: s.signature_url, type: 'signature' });
      });

      (evs || []).forEach((e: any, idx: number) => {
        if (e.file_url) items.push({ id: `ev-${idx}`, url: e.file_url, type: 'evidence', fileName: e.file_name });
      });

      return [...extraItems, ...items];
    }
  });

  if (isLoading || !attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
      <div className="w-full text-xs text-muted-foreground mb-1">Archivos adjuntos:</div>
      {attachments.map((item) => (
        <AttachmentItem 
          key={item.id} 
          url={item.url} 
          type={item.type} 
          fileName={item.fileName} 
          tenantId={tenantId}
        />
      ))}
    </div>
  );
}
