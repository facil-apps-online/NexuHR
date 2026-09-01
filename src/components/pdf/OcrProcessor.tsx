import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ScanText, FileText, Copy, Check, AlertCircle } from 'lucide-react';
import { useOcr } from '@/hooks/useOcr';
import { toast } from 'sonner';

interface OcrProcessorProps {
  file: File;
  onComplete?: (text: string) => void;
  className?: string;
}

export function OcrProcessor({ file, onComplete, className }: OcrProcessorProps) {
  const { autoOcr, isProcessing, progress, progressMessage, error } = useOcr();
  const [resultText, setResultText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleProcess = useCallback(async () => {
    try {
      const text = await autoOcr(file);
      if (text) {
        setResultText(text);
        onComplete?.(text);
        toast.success('OCR completado', { description: 'Texto extraído exitosamente' });
      } else {
        toast.info('El documento ya contiene texto seleccionable');
      }
    } catch {
      toast.error('Error al procesar OCR');
    }
  }, [file, autoOcr, onComplete]);

  const handleCopy = useCallback(() => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [resultText]);

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isImage && !isPdf) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScanText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">OCR - Texto reconocido</span>
          </div>
          {!resultText && !isProcessing && (
            <Button size="sm" variant="outline" onClick={handleProcess} className="h-8">
              <ScanText className="h-3 w-3 mr-1" />
              Extraer texto
            </Button>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progressMessage}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {resultText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-success/10 text-success border-success/20">
                <Check className="h-3 w-3 mr-1" />
                Texto extraído
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="max-h-40 overflow-auto rounded border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {resultText}
            </div>
          </div>
        )}

        {!resultText && !isProcessing && !error && (
          <p className="text-xs text-muted-foreground">
            {isPdf
              ? 'Haz clic en "Extraer texto" para reconocer el contenido escaneado del PDF.'
              : 'Haz clic en "Extraer texto" para reconocer el contenido de la imagen.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
