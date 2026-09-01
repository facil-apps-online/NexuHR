import * as pdfjsLib from 'pdfjs-dist';

const cache = new Map<string, string>();

function hashBuffer(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let hash = 0;
  for (let i = 0; i < Math.min(bytes.length, 8192); i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0;
  }
  return `ocr-${hash}`;
}

async function pdfToImages(pdfData: ArrayBuffer): Promise<Blob[]> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const doc = await loadingTask.promise;
  const images: Blob[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
    });
    images.push(blob);
  }

  return images;
}

export interface OcrResult {
  text: string;
  confidence: number;
  pages: number;
  fromCache: boolean;
}

let tesseractModule: any = null;
async function getTesseract() {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
  }
  return tesseractModule;
}

export async function ocrImage(
  image: Blob,
  lang = 'spa+eng',
  onProgress?: (progress: number) => void,
): Promise<string> {
  const buffer = await image.arrayBuffer();
  const hash = hashBuffer(buffer);
  const cached = cache.get(hash);
  if (cached !== undefined) return cached;

  const Tesseract = await getTesseract();
  const result = await Tesseract.recognize(image, lang, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = result.data.text.trim();
  cache.set(hash, text);
  return text;
}

export async function ocrPdf(
  pdfData: ArrayBuffer,
  lang = 'spa+eng',
  onProgress?: (page: number, total: number, pageProgress: number) => void,
): Promise<OcrResult> {
  const hash = hashBuffer(pdfData);
  const cached = cache.get(hash);
  if (cached !== undefined) {
    return { text: cached, confidence: 100, pages: 0, fromCache: true };
  }

  const images = await pdfToImages(pdfData);
  const texts: string[] = [];

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length, 0);
    const text = await ocrImage(images[i], lang, (p) => {
      onProgress?.(i + 1, images.length, p);
    });
    texts.push(text);
  }

  const fullText = texts.join('\n\n');
  cache.set(hash, fullText);

  return {
    text: fullText,
    confidence: 0,
    pages: images.length,
    fromCache: false,
  };
}

export function isScannedPdf(pageTexts: Array<{ fullText: string }>, threshold = 0.1): boolean {
  if (pageTexts.length === 0) return false;
  const totalChars = pageTexts.reduce((sum, p) => sum + p.fullText.length, 0);
  const avgChars = totalChars / pageTexts.length;
  return avgChars < threshold * 100;
}

export function clearOcrCache(): void {
  cache.clear();
}
