import { useParams } from 'react-router-dom';

export function usePortalSlug() {
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const slug = portalSlug || 'Funcionarios';
  return { slug, basePath: `/${slug}` };
}
