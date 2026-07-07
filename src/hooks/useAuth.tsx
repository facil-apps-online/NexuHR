import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// --- INTERFACES ---
interface Tenant {
  id: string;
  name: string;
  country_id: string;
  logo_url: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  realEmail?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  country_id?: string;
  language_id?: string;
  currency_id?: string;
  timezone?: string;
}

export interface UserAssignment {
  assignment_id: string;
  tenant_id: string;
  tenant_name: string;
  platform_id: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
  branch_id: string | null;
  branch_name: string | null;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  assignments: UserAssignment[];
  currentAssignment: UserAssignment | null;
  tenantId: string | undefined;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAssignment: (assignmentId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfileAvatar: (avatarUrl: string) => void;
  loading: boolean;
  supabaseClient: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; supabaseClient: any }> = ({ children, supabaseClient }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<UserAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const previousAssignmentRef = useRef<UserAssignment | null>(null);

  const tenantId = currentAssignment?.tenant_id;

  const { data: tenant, isLoading: isTenantLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabaseClient.functions.invoke('tenant-actions', {
        body: { action: 'get-tenant-details' }
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const processSession = useCallback(async (sessionData: Session | null) => {
    try {
      setSession(sessionData);
      setUser(sessionData?.user ?? null);

      if (sessionData?.user) {
        const { app_metadata, user_metadata, id, email } = sessionData.user;

        const userProfile: UserProfile = {
          id,
          email: email || '',
          realEmail: user_metadata.real_email,
          firstName: user_metadata.first_name,
          lastName: user_metadata.last_name,
          avatarUrl: user_metadata.avatar_url,
          country_id: user_metadata.country_id,
          language_id: user_metadata.language_id,
          currency_id: user_metadata.currency_id,
          timezone: user_metadata.timezone,
        };
        setProfile(userProfile);

        // Si no hay assignments o están incompletos, rehidratar desde el Core
        if (!app_metadata?.assignments || app_metadata.assignments.length === 0 || !app_metadata.assignments[0]?.tenant_name) {
          const platformId = import.meta.env.VITE_PLATFORM_ID;
          if (!platformId) throw new Error("Platform ID no configurado en las variables de entorno.");

          const { data, error: refreshError } = await supabaseClient.functions.invoke('user-actions', {
            body: {
              action: 'refresh-user-metadata',
              payload: { userId: id, platformId }
            }
          });

          if (refreshError) throw new Error(`Error de red al rehidratar metadatos: ${refreshError.message}`);
          if (data && !data.success) throw new Error(`Error en servidor al rehidratar metadatos: ${data.message}`);

          await supabaseClient.auth.refreshSession();
          return;
        }

        const allAssignments: UserAssignment[] = app_metadata.assignments || [];
        setAssignments(allAssignments);

        if (allAssignments.length === 0) {
          await supabaseClient.auth.signOut();
          navigate('/auth');
          return;
        }

        // Seleccionar la asignación activa (última usada o por prioridad de rol)
        let selectedAssignment: UserAssignment | null = null;
        const lastSelectedId = localStorage.getItem('nexuhr-lastSelectedAssignmentId');

        if (lastSelectedId) {
          selectedAssignment = allAssignments.find(a => a.assignment_id === lastSelectedId) || null;
        }

        if (!selectedAssignment) {
          const rolePriority = ['tenant_super_admin', 'tenant_admin', 'tenant_user'];
          for (const roleName of rolePriority) {
            const found = allAssignments.find(a => a.role_name === roleName);
            if (found) { selectedAssignment = found; break; }
          }
        }

        if (!selectedAssignment) selectedAssignment = allAssignments[0];

        setCurrentAssignment(selectedAssignment);
      } else {
        setProfile(null);
        setAssignments([]);
        setCurrentAssignment(null);
      }
    } catch (error) {
      console.error("Error procesando la sesión:", error);
      setAssignments([]);
      setCurrentAssignment(null);
      await supabaseClient.auth.signOut();
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, navigate]);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        processSession(session);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabaseClient, processSession]);

  const login = async (email: string, password: string) => {
    await supabaseClient.auth.signOut();

    const platformId = import.meta.env.VITE_PLATFORM_ID;
    if (!platformId) throw new Error("Platform ID no está configurado en el cliente.");

    const { data, error } = await supabaseClient.functions.invoke('user-actions', {
      body: {
        action: 'login-tenant',
        payload: { email, password, platform_id: platformId },
      },
    });

    if (error) {
      console.error("Error invocando user-actions:", error);
      throw new Error("Error en la comunicación con el servidor. Por favor, intenta de nuevo.");
    }

    if (!data.success) throw new Error(data.message || "Error desconocido durante el inicio de sesión.");

    if (data.session) {
      await supabaseClient.auth.setSession(data.session);

      const { data: refreshData, error: refreshError } = await supabaseClient.functions.invoke('user-actions', {
        body: {
          action: 'refresh-user-metadata',
          payload: { userId: data.session.user.id, platformId }
        }
      });

      if (refreshError) throw new Error(`Error de red al rehidratar metadatos: ${refreshError.message}`);
      if (refreshData && !refreshData.success) throw new Error(`Error en servidor al rehidratar metadatos: ${refreshData.message}`);

      await supabaseClient.auth.refreshSession();
      navigate('/dashboard');
    } else {
      throw new Error("No se recibieron datos de sesión válidos del servidor.");
    }
  };

  const logout = async () => {
    await supabaseClient.auth.signOut();
    navigate('/auth');
  };

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabaseClient.auth.refreshSession();
    if (data.session) processSession(data.session);
    if (error) {
      console.error("Error al refrescar la sesión:", error);
      logout();
    }
  }, [supabaseClient, processSession]);

  const switchAssignment = async (assignmentId: string) => {
    if (!user) throw new Error("Usuario no autenticado para cambiar de asignación.");

    const newAssignment = assignments.find(a => a.assignment_id === assignmentId);
    if (!newAssignment) {
      console.error("La asignación seleccionada no se encontró.");
      return;
    }

    previousAssignmentRef.current = currentAssignment;
    setCurrentAssignment(newAssignment);
    localStorage.setItem('nexuhr-lastSelectedAssignmentId', assignmentId);

    try {
      const { data, error } = await supabaseClient.functions.invoke('user-actions', {
        body: {
          action: 'switch-assignment',
          payload: { userId: user.id, newAssignmentId: assignmentId },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || "Error al cambiar de asignación en el backend.");

      await refreshUser();
      toast({
        title: "Contexto cambiado",
        description: `Ahora estás operando en ${newAssignment.tenant_name}.`,
      });
    } catch (error: any) {
      console.error("Fallo al cambiar de contexto:", error);
      setCurrentAssignment(previousAssignmentRef.current);
      localStorage.setItem('nexuhr-lastSelectedAssignmentId', previousAssignmentRef.current?.assignment_id || '');
      toast({
        title: "Error al cambiar de contexto",
        description: error.message || "Ocurrió un error inesperado al cambiar de contexto.",
        variant: "destructive",
      });
    }
  };

  const updateProfileAvatar = useCallback((avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatarUrl } : null);
  }, []);

  const overallLoading = loading || (!!tenantId && isTenantLoading);

  const contextValue = useMemo(() => ({
    session,
    user,
    profile,
    tenant: tenant || null,
    assignments,
    currentAssignment,
    tenantId: currentAssignment?.tenant_id,
    isAuthenticated: !!currentAssignment && currentAssignment.status === 'active',
    login,
    logout,
    switchAssignment,
    refreshUser,
    updateProfileAvatar,
    loading: overallLoading,
    supabaseClient,
  }), [session, user, profile, tenant, assignments, currentAssignment, overallLoading, refreshUser, updateProfileAvatar, supabaseClient]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

