import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const provider = searchParams.get('provider');
    const accountEmail = searchParams.get('accountEmail');
    const error = searchParams.get('error');

    try {
      if (success === 'true' && provider) {
        if (window.opener) {
          window.opener.postMessage({ type: 'auth-success', provider, accountEmail }, window.location.origin);
        }
      } else if (success === 'false') {
        if (window.opener) {
          window.opener.postMessage({ type: 'auth-error', provider, error }, window.location.origin);
        }
      }
    } catch {
      // ignore cross-origin errors
    } finally {
      setTimeout(() => {
        try { window.close(); } catch { /* ignore */ }
      }, 100);
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Procesando autenticación...</h1>
        <p className="text-sm text-muted-foreground">Esta ventana se cerrará automáticamente.</p>
      </div>
    </div>
  );
}
