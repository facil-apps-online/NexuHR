import { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { getPageText, type PdfPageText } from '@/lib/pdf-utils';

interface UsePdfDocumentOptions {
  url: string;
  enabled?: boolean;
}

interface UsePdfDocumentResult {
  doc: PDFDocumentProxy | null;
  pages: PDFPageProxy[];
  pageTexts: PdfPageText[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  scale: number;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function usePdfDocument({ url, enabled = true }: UsePdfDocumentOptions): UsePdfDocumentResult {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [pageTexts, setPageTexts] = useState<PdfPageText[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!url || !enabled) return;

    let cancelled = false;

    const loadDoc = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdfDoc = await loadingTask.promise;

        if (cancelled) {
          pdfDoc.destroy();
          return;
        }

        if (docRef.current) {
          docRef.current.destroy();
        }

        docRef.current = pdfDoc;
        setDoc(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);

        const pagePromises: Promise<PDFPageProxy>[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pagePromises.push(pdfDoc.getPage(i));
        }
        const loadedPages = await Promise.all(pagePromises);

        if (cancelled) {
          loadedPages.forEach(p => p.cleanup());
          pdfDoc.destroy();
          return;
        }

        setPages(loadedPages);

        const texts = await Promise.all(loadedPages.map(p => getPageText(p)));
        if (!cancelled) {
          setPageTexts(texts);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Error al cargar el PDF');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  return {
    doc,
    pages,
    pageTexts,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
    scale,
    setScale,
    zoomIn,
    zoomOut,
  };
}
