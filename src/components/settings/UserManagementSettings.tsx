import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
// Use supabase.functions.invoke() directly
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Mail, Search, Users, UserCheck, UserX } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Role = Tables<"roles">;

interface UserWithRoles extends Profile {
  user_roles: {
    role_id: string;
    roles: Role;
  }[];
}

export function UserManagementSettings() {
  const { currentAssignment, tenantId } = useAuth();
  const platformId = currentAssignment?.platform_id;
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteData, setInviteData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    roleId: "",
  });

  // Fetch available roles for the tenant
  const { data: availableRoles = [] } = useQuery({
    queryKey: ["available-roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("id, name")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`); // Include tenant-specific + global roles
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-management", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user_roles with roles for all users
      const userIds = profiles.map((p) => p.user_id);
      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role_id,
          roles (*)
        `)
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Map roles to users
      return profiles.map((p) => ({
        ...p,
        user_roles: (userRolesData || [])
          .filter((ur) => ur.user_id === p.user_id)
          .map((ur) => ({ role_id: ur.role_id, roles: ur.roles as Role })),
      })) as UserWithRoles[];
    },
    enabled: !!tenantId,
  });

  // Toggle user active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      toast.success(active ? "Usuario activado" : "Usuario desactivado");
    },
    onError: (error) => {
      console.error("Error toggling user status:", error);
      toast.error("Error al cambiar el estado del usuario");
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; roleId: string }) => {
      if (!tenantId) throw new Error("No tenant found");
      if (!platformId) throw new Error("No platformId found");

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
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      toast.success("Invitación enviada correctamente");
      setIsInviteDialogOpen(false);
      setInviteData({ email: "", firstName: "", lastName: "", roleId: "" });
    },
    onError: (error) => {
      console.error("Error inviting user:", error);
      toast.error("Error al enviar la invitación: " + error.message);
    },
  });

  const handleInvite = () => {
    if (!inviteData.email) {
      toast.error("El correo electrónico es requerido");
      return;
    }
    if (!inviteData.roleId) {
      toast.error("El rol es requerido");
      return;
    }
    inviteUserMutation.mutate(inviteData);
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const activeUsers = users.filter((u) => u.active !== false);
  const inactiveUsers = users.filter((u) => u.active === false);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "U";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-destructive/10 p-3">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveUsers.length}</p>
                <p className="text-sm text-muted-foreground">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestiona los usuarios de tu organización
              </CardDescription>
            </div>
            <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : "Sin nombre"}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.is_super_admin && (
                            <Badge className="bg-amber-500 hover:bg-amber-600">
                              Super Admin
                            </Badge>
                          )}
                          {user.user_roles?.filter(ur => !(user.is_super_admin && ur.roles?.is_system)).length > 0 ? (
                            user.user_roles
                              .filter(ur => !(user.is_super_admin && ur.roles?.is_system))
                              .slice(0, 2)
                              .map((ur) => (
                                <Badge key={ur.role_id} variant="secondary">
                                  {ur.roles?.name}
                                </Badge>
                              ))
                          ) : (
                            !user.is_super_admin && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Sin roles
                              </Badge>
                            )
                          )}
                          {user.user_roles?.filter(ur => !(user.is_super_admin && ur.roles?.is_system)).length > 2 && (
                            <Badge variant="outline">
                              +{user.user_roles.filter(ur => !(user.is_super_admin && ur.roles?.is_system)).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.active !== false ? "default" : "secondary"}
                          className={user.active !== false ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {user.active !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={user.active !== false}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              userId: user.user_id,
                              active: checked,
                            })
                          }
                          disabled={user.is_super_admin || toggleActiveMutation.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
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
                onChange={(e) =>
                  setInviteData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-firstName">Nombre</Label>
                <Input
                  id="invite-firstName"
                  placeholder="Juan"
                  value={inviteData.firstName}
                  onChange={(e) =>
                    setInviteData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-lastName">Apellido</Label>
                <Input
                  id="invite-lastName"
                  placeholder="Pérez"
                  value={inviteData.lastName}
                  onChange={(e) =>
                    setInviteData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
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
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? "Enviando..." : "Enviar Invitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
