import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type PermissionAction = "ver" | "crear" | "editar" | "eliminar";

interface UserPermission {
  moduleCode: string;
  action: PermissionAction;
}

interface UsePermissionsReturn {
  permissions: UserPermission[];
  loading: boolean;
  hasPermission: (moduleCode: string, action: PermissionAction) => boolean;
  hasAnyPermission: (moduleCode: string) => boolean;
  isSuperAdmin: boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, profile, currentAssignment } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.is_super_admin || currentAssignment?.role_name === 'Administrador' || currentAssignment?.role_name === 'tenant_super_admin' || false;

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Super admins have all permissions, no need to fetch
    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's role permissions
      const { data: rolePermissions, error: roleError } = await supabase
        .from("user_roles")
        .select(`
          role_id,
          roles!inner (
            role_permissions (
              permissions!inner (
                action,
                modules!inner (
                  code
                )
              )
            )
          )
        `)
        .eq("user_id", user.id);

      if (roleError) {
        console.error("Error fetching role permissions:", roleError);
        setLoading(false);
        return;
      }

      // Fetch individual user permissions
      const { data: userPermissions, error: userError } = await supabase
        .from("user_permissions")
        .select(`
          granted,
          permissions!inner (
            action,
            modules!inner (
              code
            )
          )
        `)
        .eq("user_id", user.id);

      if (userError) {
        console.error("Error fetching user permissions:", userError);
      }

      // Build permissions map from roles
      const permissionsMap = new Map<string, boolean>();

      rolePermissions?.forEach((userRole: any) => {
        userRole.roles?.role_permissions?.forEach((rp: any) => {
          const key = `${rp.permissions.modules.code}:${rp.permissions.action}`;
          permissionsMap.set(key, true);
        });
      });

      // Apply individual user permissions (can grant or revoke)
      userPermissions?.forEach((up: any) => {
        const key = `${up.permissions.modules.code}:${up.permissions.action}`;
        if (up.granted) {
          permissionsMap.set(key, true);
        } else {
          permissionsMap.delete(key);
        }
      });

      // Convert to array
      const permsList: UserPermission[] = [];
      permissionsMap.forEach((_, key) => {
        const [moduleCode, action] = key.split(":");
        permsList.push({ moduleCode, action: action as PermissionAction });
      });

      setPermissions(permsList);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (moduleCode: string, action: PermissionAction): boolean => {
      if (isSuperAdmin) return true;
      return permissions.some(
        (p) => p.moduleCode === moduleCode && p.action === action
      );
    },
    [permissions, isSuperAdmin]
  );

  const hasAnyPermission = useCallback(
    (moduleCode: string): boolean => {
      if (isSuperAdmin) return true;
      return permissions.some((p) => p.moduleCode === moduleCode);
    },
    [permissions, isSuperAdmin]
  );

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    isSuperAdmin,
    refetch: fetchPermissions,
  };
}

// Component for conditional rendering based on permissions
interface PermissionGateProps {
  moduleCode: string;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  moduleCode,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();

  if (loading) return null;

  const hasAccess = action
    ? hasPermission(moduleCode, action)
    : hasAnyPermission(moduleCode);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
