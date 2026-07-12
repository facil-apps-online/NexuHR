import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';

export function DynamicTenantBranding() {
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);
  
  // Lista de rutas principales que no son portales de empresas
  const reserved = [
    'auth', 'dashboard', 'empleados', 'vigilancias', 'examenes', 'cursos', 
    'dotacion', 'comites', 'eventos', 'firmas', 'evaluaciones', 'comunicaciones', 
    'nomina', 'reglamento', 'configuracion', 'perfil', 'notificaciones', 
    'incapacidades', 'activos-fijos', 'suscripcion', 'payment-success', 
    'payment-failure', 'register-tenant', 'Funcionarios'
  ];
  
  let slug: string | null = null;
  if (parts.length > 0 && !reserved.includes(parts[0])) {
    slug = parts[0];
  }

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-branding', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('get_tenant_by_portal_slug', { p_slug: slug });
      if (error) {
        console.error("Error fetching tenant branding:", error);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row as { tenant_id: string; logo_url: string | null; tenant_name: string } | null;
    },
    enabled: !!slug,
  });

  const { displayUrl: logoSrc } = useGoogleDriveImage(tenantInfo?.logo_url || undefined, tenantInfo?.tenant_id);

  useEffect(() => {
    if (!tenantInfo || !logoSrc || !slug) return;

    // 1. Actualizar el título de la pestaña
    document.title = `${tenantInfo.tenant_name} - Portal`;

    // 2. Generar el Manifiesto Dinámico en memoria
    const manifest = {
      name: `Portal de ${tenantInfo.tenant_name}`,
      short_name: tenantInfo.tenant_name,
      start_url: `/${slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0ea5e9", // Podríamos traerlo de la DB a futuro
      icons: [
        {
          src: logoSrc,
          sizes: "192x192 512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // 3. Inyectar el manifiesto en el DOM
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = manifestUrl;
    }

    // 4. Inyectar el ícono para Apple (iOS)
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon) {
      appleIcon.href = logoSrc;
    }
    
    // Limpieza de memoria
    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [tenantInfo, logoSrc, slug]);

  return null;
}
