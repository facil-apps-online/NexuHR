import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Role = Tables<"roles">;
type Profile = Tables<"profiles">;

export interface UserWithRoles extends Profile {
  user_roles: {
    role_id: string;
    roles: Role;
  }[];
}

export function useRolesPermissions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUserRolesDialogOpen, setIsUserRolesDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [activeTab, setActiveTab] = useState("roles");
  const queryClient = useQueryClient();
  const { currentAssignment } = useAuth();
  const tenantId = currentAssignment?.tenant_id;

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .or(`tenant_id.eq.${tenantId},is_system.eq.true`)
        .order("name");
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!tenantId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*, modules(code, name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["tenant_users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("first_name");
      
      if (profilesError) throw profilesError;

      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role_id,
          roles (*)
        `);
      
      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile) => ({
        ...profile,
        user_roles: userRolesData
          ?.filter((ur) => ur.user_id === profile.user_id)
          .map((ur) => ({ role_id: ur.role_id, roles: ur.roles as Role })) || [],
      }));

      return usersWithRoles as UserWithRoles[];
    },
    enabled: !!tenantId,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string }) => {
      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { data, error } = await supabase
        .from("roles")
        .insert({
          name: roleData.name,
          description: roleData.description,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Rol creado exitosamente");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Error al crear el rol: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (roleData: { id: string; name: string; description: string }) => {
      const { data, error } = await supabase
        .from("roles")
        .update({
          name: roleData.name,
          description: roleData.description,
        })
        .eq("id", roleData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Rol actualizado exitosamente");
      setIsDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error) => {
      toast.error("Error al actualizar el rol: " + error.message);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Rol eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el rol: " + error.message);
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, granted }: { roleId: string; permissionId: string; granted: boolean }) => {
      if (granted) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role_id: roleId, permission_id: permissionId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
      toast.success("Permiso actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar permiso: " + error.message);
    },
  });

  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) throw deleteError;

      if (roleIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_users"] });
      toast.success("Roles de usuario actualizados");
      setIsUserRolesDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error("Error al actualizar roles: " + error.message);
    },
  });

  const toggleUserPermissionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      permissionId, 
      currentState 
    }: { 
      userId: string; 
      permissionId: string; 
      currentState: "granted" | "revoked" | "inherited" | "none";
    }) => {
      if (currentState === "none") {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission_id: permissionId, granted: true });
        if (error) throw error;
      } else if (currentState === "inherited") {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission_id: permissionId, granted: false });
        if (error) throw error;
      } else if (currentState === "granted" || currentState === "revoked") {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_permissions"] });
      toast.success("Permiso de usuario actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar permiso: " + error.message);
    },
  });

  const handleCreateRole = (data: { name: string; description: string }) => {
    createRoleMutation.mutate(data);
  };

  const handleUpdateRole = (data: { name: string; description: string }) => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, ...data });
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm("¿Estás seguro de eliminar este rol?")) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleTogglePermission = (roleId: string, permissionId: string, currentlyGranted: boolean) => {
    togglePermissionMutation.mutate({ roleId, permissionId, granted: !currentlyGranted });
  };

  const handleToggleUserPermission = (
    userId: string, 
    permissionId: string, 
    currentState: "granted" | "revoked" | "inherited" | "none"
  ) => {
    toggleUserPermissionMutation.mutate({ userId, permissionId, currentState });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRole(null);
  };

  const handleManageUserRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsUserRolesDialogOpen(true);
  };

  const handleUpdateUserRoles = (userId: string, roleIds: string[]) => {
    updateUserRolesMutation.mutate({ userId, roleIds });
  };

  const handleCloseUserRolesDialog = () => {
    setIsUserRolesDialogOpen(false);
    setSelectedUser(null);
  };

  return {
    // State
    isDialogOpen,
    setIsDialogOpen,
    isUserRolesDialogOpen,
    selectedRole,
    selectedUser,
    activeTab,
    setActiveTab,
    
    // Data
    roles,
    rolesLoading,
    modules,
    permissions,
    rolePermissions,
    userPermissions,
    users,
    usersLoading,
    
    // Mutations loading states
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isUpdatingUserRoles: updateUserRolesMutation.isPending,
    
    // Handlers
    handleCreateRole,
    handleUpdateRole,
    handleEditRole,
    handleDeleteRole,
    handleTogglePermission,
    handleToggleUserPermission,
    handleCloseDialog,
    handleManageUserRoles,
    handleUpdateUserRoles,
    handleCloseUserRolesDialog,
  };
}
