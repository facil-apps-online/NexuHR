import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PdfPageText {
  pageNumber: number;
  items: TextItem[];
  fullText: string;
}

export async function loadPdfDocument(data: string | ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(
    typeof data === 'string' ? { url: data } : { data }
  );
  return loadingTask.promise;
}

export async function getPageText(page: PDFPageProxy): Promise<PdfPageText> {
  const textContent: TextContent = await page.getTextContent();
  const items = textContent.items.filter((item): item is TextItem => 'str' in item);
  const fullText = items.map(item => item.str).join(' ');
  return {
    pageNumber: page.pageNumber,
    items,
    fullText,
  };
}

export async function getDocumentText(doc: PDFDocumentProxy): Promise<PdfPageText[]> {
  const pages: PdfPageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const pageText = await getPageText(page);
    pages.push(pageText);
  }
  return pages;
}

export function searchInPages(pages: PdfPageText[], query: string): PdfPageText[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return pages.filter(p => p.fullText.toLowerCase().includes(lowerQuery));
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}
