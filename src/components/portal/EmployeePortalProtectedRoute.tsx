import { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { Loader2 } from 'lucide-react';

export function EmployeePortalProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user, account } = useEmployeePortalAuth();
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const location = useLocation();
  const slug = portalSlug || 'Funcionarios';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to={`/${slug}`} replace />;
  if (!account || account.status !== 'active') return <Navigate to={`/${slug}`} replace />;

  if (account.must_change_password && !location.pathname.endsWith('/cambiar-clave')) {
    return <Navigate to={`/${slug}/cambiar-clave`} replace />;
  }

  return <>{children}</>;
}
