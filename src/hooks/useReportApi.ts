import { useState } from 'react';

interface UseReportApiOptions {
  apiUrl: string;
  apiKey: string;
}

interface SaveTemplateOptions {
  templateKey: string;
  repxBase64: string;
  description?: string;
}

interface GeneratePdfOptions {
  templateKey: string;
  data: Record<string, any>;
  asBase64?: boolean;
}

interface UseReportApiReturn {
  saveTemplate: (options: SaveTemplateOptions) => Promise<{ success: boolean; fileId: string }>;
  generatePdf: (options: GeneratePdfOptions) => Promise<Blob | { pdfBase64: string }>;
  loading: boolean;
  error: Error | null;
}

export function useReportApi(options: UseReportApiOptions): UseReportApiReturn {
  const { apiUrl, apiKey } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveTemplate = async (options: SaveTemplateOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/templates/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async (options: GeneratePdfOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          templateKey: options.templateKey,
          data: options.data,
          asBase64: options.asBase64 || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (options.asBase64) {
        return await response.json();
      }

      return await response.blob();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { saveTemplate, generatePdf, loading, error };
}
