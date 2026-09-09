import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Plus, Pencil, Trash2, FileSignature, CheckCircle, Minus, CirclePlus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Module = Tables<"modules">;
type Permission = Tables<"permissions"> & {
  modules: { code: string; name: string } | null;
};
type RolePermission = Tables<"role_permissions">;
type UserPermission = Tables<"user_permissions">;

interface UserPermissionsMatrixProps {
  userId: string;
  userRoleIds: string[];
  modules: Module[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  userPermissions: UserPermission[];
  onToggleUserPermission: (permissionId: string, currentState: "granted" | "revoked" | "inherited" | "none") => void;
  isSuperAdmin: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  ver: <Eye className="h-3.5 w-3.5" />,
  crear: <Plus className="h-3.5 w-3.5" />,
  editar: <Pencil className="h-3.5 w-3.5" />,
  eliminar: <Trash2 className="h-3.5 w-3.5" />,
  firmar: <FileSignature className="h-3.5 w-3.5" />,
  aprobar: <CheckCircle className="h-3.5 w-3.5" />,
};

const actionLabels: Record<string, string> = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
  firmar: "Firmar",
  aprobar: "Aprobar",
};

export function UserPermissionsMatrix({
  userId,
  userRoleIds,
  modules,
  permissions,
  rolePermissions,
  userPermissions,
  onToggleUserPermission,
  isSuperAdmin,
}: UserPermissionsMatrixProps) {
  // Check if permission is inherited from roles
  const isInheritedFromRoles = (permissionId: string): boolean => {
    return rolePermissions.some(
      (rp) => userRoleIds.includes(rp.role_id) && rp.permission_id === permissionId
    );
  };

  // Get user-specific permission state
  const getUserPermissionState = (permissionId: string): "granted" | "revoked" | "inherited" | "none" => {
    const userPerm = userPermissions.find(
      (up) => up.user_id === userId && up.permission_id === permissionId
    );
    
    if (userPerm) {
      return userPerm.granted ? "granted" : "revoked";
    }
    
    if (isInheritedFromRoles(permissionId)) {
      return "inherited";
    }
    
    return "none";
  };

  // Check if user effectively has the permission
  const hasPermission = (permissionId: string): boolean => {
    const state = getUserPermissionState(permissionId);
    return state === "granted" || state === "inherited";
  };

  const getModulePermissions = (moduleCode: string): Permission[] => {
    return permissions.filter((p) => p.modules?.code === moduleCode);
  };

  const getStateIcon = (state: "granted" | "revoked" | "inherited" | "none") => {
    switch (state) {
      case "granted":
        return <CirclePlus className="h-4 w-4 text-green-600" />;
      case "revoked":
        return <Minus className="h-4 w-4 text-red-600" />;
      case "inherited":
        return null; // Just show checked
      case "none":
        return null;
    }
  };

  const getTooltipText = (state: "granted" | "revoked" | "inherited" | "none", action: string, moduleName: string) => {
    switch (state) {
      case "granted":
        return `Permiso individual otorgado. Click para remover.`;
      case "revoked":
        return `Permiso revocado (anula el rol). Click para restaurar.`;
      case "inherited":
        return `Heredado del rol. Click para revocar individualmente.`;
      case "none":
        return `Sin permiso. Click para otorgar individualmente.`;
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Los Super Admins tienen todos los permisos automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-h-[400px] overflow-y-auto overflow-x-auto rounded-md">
      <div className="min-w-[500px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-48 bg-muted/50 font-semibold">
                Módulo / Acción
              </TableHead>
              <TableHead className="bg-muted/50 text-center font-semibold w-24">
                Rol
              </TableHead>
              <TableHead className="bg-muted/50 text-center font-semibold w-32">
                Individual
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => {
              const modulePermissions = getModulePermissions(module.code);
              if (modulePermissions.length === 0) return null;

              return (
                <>
                  <TableRow
                    key={`module-${module.id}`}
                    className="bg-secondary/30 hover:bg-secondary/40"
                  >
                    <TableCell
                      colSpan={3}
                      className="font-semibold text-foreground"
                    >
                      {module.name}
                    </TableCell>
                  </TableRow>
                  {modulePermissions.map((permission) => {
                    const state = getUserPermissionState(permission.id);
                    const inherited = isInheritedFromRoles(permission.id);
                    const effective = hasPermission(permission.id);
                    
                    return (
                      <TableRow key={permission.id}>
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {actionIcons[permission.action] || null}
                            </span>
                            <span className="text-sm">
                              {actionLabels[permission.action] || permission.action}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={inherited}
                            disabled
                            className="opacity-60"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center items-center gap-1">
                                <Checkbox
                                  checked={effective}
                                  onCheckedChange={() => onToggleUserPermission(permission.id, state)}
                                  className={
                                    state === "granted"
                                      ? "border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                      : state === "revoked"
                                      ? "border-red-600"
                                      : ""
                                  }
                                />
                                {getStateIcon(state)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getTooltipText(state, actionLabels[permission.action], module.name)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
