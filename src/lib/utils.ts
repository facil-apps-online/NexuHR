import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null, fmt = "d 'de' MMMM, yyyy"): string {
  if (!date) return "No especificado";
  return format(safeNewDate(date), fmt, { locale: es });
}

export function formatShortDate(date: string | null): string {
  return formatDate(date, "d MMM yyyy");
}

/** Creates a Date from a DB date string without timezone shift.
 *  "YYYY-MM-DD" → local midnight; ISO strings → parsed normally. */
export function safeNewDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([^/?#&]+)/,
    /[?&]id=([^&]+)/,
    /\/open\?id=([^&]+)/,
    /\/uc\?.*id=([^&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getProxyImageUrl(logoUrl: string | null | undefined, tenantId?: string, platformId?: string): string | undefined {
  if (!logoUrl) return undefined;
  const fileId = getGoogleDriveFileId(logoUrl);
  if (fileId && tenantId && platformId) {
    const coreUrl = import.meta.env.VITE_CORE_SUPABASE_URL;
    if (!coreUrl) return logoUrl;
    return `${coreUrl}/functions/v1/proxy-google-drive-image?fileId=${fileId}&tenantId=${tenantId}&platformId=${platformId}`;
  }
  return logoUrl;
}
