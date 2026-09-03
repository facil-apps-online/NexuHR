import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCog, Trash2, Mail } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Role = Tables<"roles">;

interface UserWithRoles extends Profile {
  user_roles: {
    role_id: string;
    roles: Role;
  }[];
}

interface UserRolesListProps {
  users: UserWithRoles[];
  isLoading: boolean;
  onManageRoles: (user: UserWithRoles) => void;
  onRemoveUser?: (userId: string) => void;
}

export function UserRolesList({
  users,
  isLoading,
  onManageRoles,
  onRemoveUser,
}: UserRolesListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCog className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay usuarios</h3>
          <p className="text-sm text-muted-foreground">
            Los usuarios aparecerán aquí cuando se registren
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <Card key={user.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={user.avatar_url}
                  firstName={user.first_name}
                  lastName={user.last_name}
                  className="h-12 w-12"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : "Sin nombre"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border shadow-md">
                  <DropdownMenuItem onClick={() => onManageRoles(user)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Gestionar roles
                  </DropdownMenuItem>
                  {onRemoveUser && (
                    <DropdownMenuItem
                      onClick={() => onRemoveUser(user.user_id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar usuario
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {user.is_super_admin && (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                  Super Admin
                </Badge>
              )}
              {/* Filter out system roles (Administrador) when user is super admin to avoid redundant badges */}
              {user.user_roles?.filter(ur => !(user.is_super_admin && ur.roles?.is_system)).length > 0 ? (
                user.user_roles
                  .filter(ur => !(user.is_super_admin && ur.roles?.is_system))
                  .map((ur) => (
                    <Badge key={ur.role_id} variant="secondary">
                      {ur.roles?.name}
                    </Badge>
                  ))
              ) : (
                !user.is_super_admin && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Sin roles asignados
                  </Badge>
                )
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
