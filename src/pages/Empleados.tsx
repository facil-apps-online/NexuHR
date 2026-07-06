import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import { Search, UserPlus, Filter, MoreVertical, Loader2, List, Network, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { EmpleadoForm, EmployeeFormData } from "@/components/empleados/EmpleadoForm";
import { Organigrama } from "@/components/empleados/Organigrama";
import { BulkUpload } from "@/components/empleados/BulkUpload";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Empleados() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!profile?.tenant_id) throw new Error("No tenant_id");
      
      const { error } = await supabase.from("employees").insert([{
        document_type: data.document_type,
        document_number: data.document_number,
        first_name: data.first_name,
        last_name: data.last_name,
        active: data.active,
        tenant_id: profile.tenant_id,
        email: data.email || null,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
        hire_date: data.hire_date || null,
        termination_date: data.termination_date || null,
        position: data.position || null,
        department: data.department || null,
        supervisor_id: data.supervisor_id || null,
        address: data.address || null,
        city: data.city || null,
        emergency_contact: data.emergency_contact || null,
        emergency_phone: data.emergency_phone || null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees_for_supervisor"] });
      setIsCreateOpen(false);
      toast.success("Empleado creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear empleado: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeFormData }) => {
      const { error } = await supabase
        .from("employees")
        .update({
          document_type: data.document_type,
          document_number: data.document_number,
          first_name: data.first_name,
          last_name: data.last_name,
          active: data.active,
          email: data.email || null,
          phone: data.phone || null,
          birth_date: data.birth_date || null,
          hire_date: data.hire_date || null,
          termination_date: data.termination_date || null,
          position: data.position || null,
          department: data.department || null,
          supervisor_id: data.supervisor_id || null,
          address: data.address || null,
          city: data.city || null,
          emergency_contact: data.emergency_contact || null,
          emergency_phone: data.emergency_phone || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees_for_supervisor"] });
      setEditingEmployee(null);
      toast.success("Empleado actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar empleado: ${error.message}`);
    },
  });

  const filteredEmployees = employees?.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return (
      fullName.includes(term) ||
      emp.document_number.toLowerCase().includes(term) ||
      emp.position?.toLowerCase().includes(term) ||
      emp.department?.toLowerCase().includes(term)
    );
  });

  const employeeBeingEdited = editingEmployee
    ? employees?.find((e) => e.id === editingEmployee)
    : null;

  const employeeColumns: ResponsiveColumn<typeof filteredEmployees extends (infer U)[] | undefined ? U : never>[] = [
    {
      key: "name",
      label: "Nombre",
      primary: true,
      render: (emp) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {emp.first_name?.[0]}{emp.last_name?.[0]}
          </div>
          {emp.first_name} {emp.last_name}
        </div>
      ),
    },
    {
      key: "document",
      label: "Documento",
      subtitle: true,
      render: (emp) => `${emp.document_type} ${emp.document_number}`,
    },
    {
      key: "position",
      label: "Cargo",
      render: (emp) => emp.position || "-",
    },
    {
      key: "department",
      label: "Área",
      render: (emp) => emp.department || "-",
      hideOnMobile: true,
    },
    {
      key: "status",
      label: "Estado",
      render: (emp) =>
        emp.active ? (
          <Badge className="bg-success/10 text-success border-success/20">Activo</Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
        ),
    },
  ];

  const exportToExcel = () => {
    const dataToExport = filteredEmployees || employees || [];
    
    if (dataToExport.length === 0) {
      toast.error("No hay empleados para exportar");
      return;
    }

    const exportData = dataToExport.map((emp) => ({
      "Tipo Doc.": emp.document_type,
      "Nro. Doc.": emp.document_number,
      "Nombres": emp.first_name,
      "Apellidos": emp.last_name,
      "Email": emp.email || "",
      "Teléfono": emp.phone || "",
      "Fecha Nac.": emp.birth_date || "",
      "Fecha Ingreso": emp.hire_date || "",
      "Fecha Retiro": emp.termination_date || "",
      "Cargo": emp.position || "",
      "Área": emp.department || "",
      "Dirección": emp.address || "",
      "Ciudad": emp.city || "",
      "Contacto Emergencia": emp.emergency_contact || "",
      "Tel. Emergencia": emp.emergency_phone || "",
      "Estado": emp.active ? "Activo" : "Inactivo",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet["!cols"] = [
      { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");
    
    const fecha = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `empleados_${fecha}.xlsx`);
    toast.success("Lista de empleados exportada");
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Empleados</h1>
            <p className="mt-1 text-muted-foreground">
              Gestiona la información de tus empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Carga Masiva
            </Button>
            <Button className="gradient-primary" onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="organigrama" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Organigrama
              </TabsTrigger>
            </TabsList>

            {activeTab === "list" && (
              <div className="flex flex-col gap-4 sm:flex-row flex-1 sm:max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre, documento, cargo o área..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveTable
              columns={employeeColumns}
              data={filteredEmployees || []}
              getKey={(emp) => emp.id}
              onRowClick={(emp) => navigate(`/empleados/${emp.id}`)}
              actions={(emp) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/empleados/${emp.id}`)}>
                      Ver perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingEmployee(emp.id)}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>Historial</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Desactivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              emptyMessage={searchTerm ? "No se encontraron empleados con ese criterio" : "No hay empleados registrados"}
            />
          )}
        </div>
          </TabsContent>

          <TabsContent value="organigrama" className="mt-0">
            <Organigrama />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para crear empleado */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Empleado</DialogTitle>
          </DialogHeader>
          <EmpleadoForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar empleado */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
          </DialogHeader>
          {employeeBeingEdited && (
            <EmpleadoForm
              employee={employeeBeingEdited}
              onSubmit={async (data) => {
                await updateMutation.mutateAsync({ id: editingEmployee!, data });
              }}
              onCancel={() => setEditingEmployee(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para carga masiva */}
      <BulkUpload
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          queryClient.invalidateQueries({ queryKey: ["employees_for_supervisor"] });
        }}
      />
    </MainLayout>
  );
}
