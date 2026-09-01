import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, X, Download, Loader2,
} from 'lucide-react';
import { usePdfDocument } from '@/hooks/usePdfDocument';
import { usePdfSearch } from '@/hooks/usePdfSearch';
import { cn } from '@/lib/utils';

interface UnifiedPdfViewerProps {
  url: string;
  className?: string;
  onTextSelect?: (text: string) => void;
}

export function UnifiedPdfViewer({ url, className, onTextSelect }: UnifiedPdfViewerProps) {
  const {
    pages, pageTexts, totalPages, currentPage, setCurrentPage,
    isLoading, error, scale, setScale, zoomIn, zoomOut,
  } = usePdfDocument({ url });

  const {
    query, setQuery, results, totalMatches, currentResultIndex,
    nextResult, prevResult, highlightedPages,
  } = usePdfSearch({ pageTexts });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [renderingPage, setRenderingPage] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pages[pageNum - 1] || !canvasContainerRef.current) return;

    setRenderingPage(pageNum);
    const page = pages[pageNum - 1];
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    const container = canvasContainerRef.current;
    container.innerHTML = '';
    container.appendChild(canvas);

    try {
      const textContent = await page.getTextContent();
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'pdf-text-layer';
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.left = '0';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      textContent.items.forEach((item: any) => {
        if (!item.str) return;
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.position = 'absolute';
        span.style.left = `${item.transform[4]}px`;
        span.style.top = `${item.transform[5] - item.height}px`;
        span.style.fontSize = `${Math.abs(item.transform[0]) || item.height}px`;
        span.style.fontFamily = item.fontName ? `${item.fontName}, sans-serif` : 'sans-serif';
        span.style.color = 'transparent';
        span.style.whiteSpace = 'pre';
        span.style.userSelect = 'text';
        span.className = 'pdf-text-span';

        if (query && highlightedPages.has(pageNum)) {
          const lowerText = item.str.toLowerCase();
          const lowerQuery = query.toLowerCase();
          if (lowerText.includes(lowerQuery)) {
            span.style.color = 'transparent';
            span.setAttribute('data-highlight', 'true');
          }
        }

        textLayerDiv.appendChild(span);
      });

      container.appendChild(textLayerDiv);
    } catch {
      // Text layer not available
    }

    setRenderingPage(null);
  }, [pages, scale, query, highlightedPages]);

  useEffect(() => {
    if (pages.length > 0 && currentPage >= 1 && currentPage <= totalPages) {
      renderPage(currentPage);
    }
  }, [currentPage, pages, renderPage, totalPages]);

  useEffect(() => {
    if (currentResult) {
      setCurrentPage(currentResult.pageNumber);
    }
  }, [currentResult, setCurrentPage]);

  const handleCopyText = useCallback(() => {
    if (!pageTexts[currentPage - 1]) return;
    navigator.clipboard.writeText(pageTexts[currentPage - 1].fullText);
  }, [pageTexts, currentPage]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Cargando PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <p className="text-destructive font-medium">Error al cargar el PDF</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col bg-muted/30 rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-background flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCopyText}>
            Copiar texto
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank')}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar texto en el PDF..."
              className="h-8 pl-7 text-sm"
              autoFocus
            />
          </div>
          {query && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {totalMatches} resultado{totalMatches !== 1 ? 's' : ''}
            </span>
          )}
          {results.length > 0 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevResult}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentResultIndex + 1}/{results.length}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextResult}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setQuery(''); setShowSearch(false); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto p-4 flex justify-center min-h-[400px]">
        {renderingPage && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div
          ref={canvasContainerRef}
          className="relative shadow-lg"
          style={{ userSelect: 'text' }}
        />
      </div>

      {/* Page thumbnails */}
      {totalPages > 1 && (
        <div className="border-t bg-background p-2 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "w-10 h-14 rounded border text-xs flex items-center justify-center transition",
                  currentPage === pageNum
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : highlightedPages.has(pageNum)
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950"
                    : "border-border hover:border-primary/50"
                )}
              >
                {pageNum}
              </button>
            ))}
            {totalPages > 20 && <span className="text-xs text-muted-foreground self-center">...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
