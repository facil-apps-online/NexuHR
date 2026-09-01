import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RolesList } from "@/components/roles/RolesList";
import { RoleForm } from "@/components/roles/RoleForm";
import { PermissionsMatrix } from "@/components/roles/PermissionsMatrix";
import { UserRolesList } from "@/components/roles/UserRolesList";
import { UserRolesForm } from "@/components/roles/UserRolesForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users2, UserCog, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRolesPermissions } from "@/hooks/useRolesPermissions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Use supabase.functions.invoke() directly

export function SecuritySettings() {
  const { tenantId, currentAssignment } = useAuth();
  const queryClient = useQueryClient();
  const platformId = currentAssignment?.platform_id;
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", firstName: "", lastName: "", roleId: "" });

  const { data: availableRoles = [] } = useQuery({
    queryKey: ["available-roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("id, name")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const {
    isDialogOpen,
    setIsDialogOpen,
    isUserRolesDialogOpen,
    selectedRole,
    selectedUser,
    activeTab,
    setActiveTab,
    roles,
    rolesLoading,
    modules,
    permissions,
    rolePermissions,
    userPermissions,
    users,
    usersLoading,
    isCreating,
    isUpdating,
    isUpdatingUserRoles,
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
  } = useRolesPermissions();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; roleId: string }) => {
      if (!tenantId) throw new Error("No tenant");
      if (!platformId) throw new Error("No platformId");
      const { data: result, error } = await supabase.functions.invoke("user-actions", {
        body: {
          action: "invite_or_assign_user_to_tenant",
          payload: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            tenantId,
            roleId: data.roleId,
            platformId,
          },
        },
      });
      if (error) throw error;
      if (!result?.success) throw new Error(result?.message || "Error al invitar usuario");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Invitación enviada correctamente");
      setIsInviteOpen(false);
      setInviteData({ email: "", firstName: "", lastName: "", roleId: "" });
    },
    onError: (err) => toast.error("Error al invitar: " + err.message),
  });

  const handleInvite = () => {
    if (!inviteData.email) return toast.error("El correo es requerido");
    inviteMutation.mutate(inviteData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Roles y Permisos</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los roles, permisos y asignaciones de usuarios
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "roles" && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Rol
            </Button>
          )}
          {activeTab === "users" && (
            <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="roles" className="gap-2">
            <Users2 className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <UserCog className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RolesList
            roles={roles}
            isLoading={rolesLoading}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserRolesList
            users={users}
            isLoading={usersLoading}
            onManageRoles={handleManageUserRoles}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsMatrix
            roles={roles}
            modules={modules}
            permissions={permissions}
            rolePermissions={rolePermissions}
            onTogglePermission={handleTogglePermission}
          />
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Editar Rol" : "Crear Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={selectedRole}
            onSubmit={selectedRole ? handleUpdateRole : handleCreateRole}
            onCancel={handleCloseDialog}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* User Roles Dialog */}
      <Dialog open={isUserRolesDialogOpen} onOpenChange={handleCloseUserRolesDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Roles y Permisos de Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserRolesForm
              user={selectedUser}
              roles={roles}
              modules={modules}
              permissions={permissions}
              rolePermissions={rolePermissions}
              userPermissions={userPermissions}
              onSubmit={handleUpdateUserRoles}
              onToggleUserPermission={handleToggleUserPermission}
              onCancel={handleCloseUserRolesDialog}
              isLoading={isUpdatingUserRoles}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación para que un nuevo usuario se una a tu organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo Electrónico *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={inviteData.email}
                onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-firstName">Nombre</Label>
                <Input
                  id="invite-firstName"
                  placeholder="Juan"
                  value={inviteData.firstName}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-lastName">Apellido</Label>
                <Input
                  id="invite-lastName"
                  placeholder="Pérez"
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol *</Label>
              <Select
                value={inviteData.roleId}
                onValueChange={(value) =>
                  setInviteData((prev) => ({ ...prev, roleId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
