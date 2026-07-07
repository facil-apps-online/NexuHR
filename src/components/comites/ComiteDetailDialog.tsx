import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";

interface ComiteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  committeeId: string;
  committeeName: string;
}

export function ComiteDetailDialog({
  open,
  onOpenChange,
  committeeId,
  committeeName,
}: ComiteDetailDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [memberRole, setMemberRole] = useState("Miembro");
  const [memberStartDate, setMemberStartDate] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["committee-members", committeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_members")
        .select(`*, employee:employees(id, first_name, last_name, position)`)
        .eq("committee_id", committeeId)
        .order("active", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-committee"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: open && showAddMember,
  });

  const { data: committeeRoles } = useQuery({
    queryKey: ["committee-roles-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_roles" as any)
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data as any) as { id: string; name: string }[];
    },
    enabled: open && showAddMember,
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("committee_members").insert({
        committee_id: committeeId,
        employee_id: selectedEmployee,
        role: memberRole,
        start_date: memberStartDate || null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Miembro agregado");
      queryClient.invalidateQueries({ queryKey: ["committee-members", committeeId] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      setShowAddMember(false);
      setSelectedEmployee("");
      setMemberRole("Miembro");
      setMemberStartDate("");
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("committee_members")
        .update({ active: false, end_date: new Date().toISOString().split("T")[0] })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Miembro desactivado");
      queryClient.invalidateQueries({ queryKey: ["committee-members", committeeId] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(safeNewDate(date), "d MMM yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{committeeName}</DialogTitle>
          <DialogDescription>Gestión de miembros del comité</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Miembros ({members?.length || 0})</h3>
            <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
              <Plus className="mr-1 h-4 w-4" />
              Agregar Miembro
            </Button>
          </div>

          {showAddMember && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Empleado *</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                   <Label className="text-xs">Rol *</Label>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {committeeRoles?.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={memberStartDate}
                    onChange={(e) => setMemberStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!selectedEmployee || addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate()}
                  >
                    {addMemberMutation.isPending ? "Agregando..." : "Agregar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !members || members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin miembros registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.employee
                        ? `${m.employee.first_name} ${m.employee.last_name}`
                        : "Empleado no encontrado"}
                    </TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{formatDate(m.start_date)}</TableCell>
                    <TableCell>
                      {m.active ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeMemberMutation.mutate(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
