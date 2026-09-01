import { useState, useCallback } from 'react';
import { ocrImage, ocrPdf, isScannedPdf, type OcrResult } from '@/lib/ocr-engine';

interface UseOcrOptions {
  lang?: string;
}

interface UseOcrResult {
  ocrImage: (file: File, onProgress?: (progress: number) => void) => Promise<string>;
  ocrPdf: (file: File, onProgress?: (page: number, total: number, pageProgress: number) => void) => Promise<OcrResult>;
  autoOcr: (file: File, pageTexts?: Array<{ fullText: string }>) => Promise<string | null>;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  lastResult: OcrResult | null;
}

export function useOcr({ lang = 'spa+eng' }: UseOcrOptions = {}): UseOcrResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OcrResult | null>(null);

  const handleOcrImage = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Procesando imagen...');
    setError(null);

    try {
      const text = await ocrImage(file, lang, (p) => {
        setProgress(p);
        onProgress?.(p);
      });
      setProgressMessage('Completado');
      return text;
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar imagen';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [lang]);

  const handleOcrPdf = useCallback(async (file: File, onProgress?: (page: number, total: number, pageProgress: number) => void) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Extrayendo páginas...');
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await ocrPdf(arrayBuffer, lang, (page, total, pageProg) => {
        setProgress(Math.round(((page - 1 + pageProg / 100) / total) * 100));
        setProgressMessage(`Página ${page}/${total}...`);
        onProgress?.(page, total, pageProg);
      });
      setProgress(100);
      setProgressMessage('Completado');
      setLastResult(result);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar PDF';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [lang]);

  const autoOcr = useCallback(async (file: File, pageTexts?: Array<{ fullText: string }>): Promise<string | null> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage) {
      return handleOcrImage(file);
    }

    if (isPdf) {
      if (pageTexts && !isScannedPdf(pageTexts)) {
        return null; // Already has selectable text
      }
      const result = await handleOcrPdf(file);
      return result.text;
    }

    return null;
  }, [handleOcrImage, handleOcrPdf]);

  return {
    ocrImage: handleOcrImage,
    ocrPdf: handleOcrPdf,
    autoOcr,
    isProcessing,
    progress,
    progressMessage,
    error,
    lastResult,
  };
}
