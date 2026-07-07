import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Search, Plus } from "lucide-react";
import { useDistributionLists } from "@/hooks/useDistributionLists";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";

// Mock para empleados miembros (esto se conectará después con la tabla distribution_list_members)
const mockMembers = [
  { id: "1", name: "Juan Pérez", role: "Operador", email: "juan@example.com" },
  { id: "2", name: "Ana Gómez", role: "Supervisora", email: "ana@example.com" },
];

export default function DistributionListEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lists, isLoading } = useDistributionLists();
  
  const list = lists.find((l) => l.id === id);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </MainLayout>
    );
  }

  if (!list) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center space-y-4 py-10">
          <p className="text-lg font-semibold">Lista no encontrada</p>
          <Button onClick={() => navigate("/comunicaciones")}>Volver a Comunicaciones</Button>
        </div>
      </MainLayout>
    );
  }

  const columns: ResponsiveColumn<any>[] = [
    {
      key: "name",
      label: "Empleado",
      primary: true,
      render: (item) => item.name,
    },
    {
      key: "role",
      label: "Cargo",
      render: (item) => item.role,
    },
    {
      key: "email",
      label: "Correo",
      hideOnMobile: true,
      render: (item) => item.email,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/comunicaciones?tab=listas")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edición Completa: {list.name}</h1>
              <p className="text-muted-foreground">
                {list.list_type === "personalizada" ? "Gestiona los miembros de la lista personalizada." : `Lista dinámica (Tipo: ${list.list_type})`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Detalles de la lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Tipo</span>
                <p className="capitalize">{list.list_type}</p>
              </div>
              {list.target_value && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Valor Objetivo</span>
                  <p>{list.target_value}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Descripción</span>
                <p>{list.description || "Sin descripción"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Miembros ({mockMembers.length})</CardTitle>
                  <CardDescription>
                    {list.list_type === "personalizada" 
                      ? "Agrega o quita miembros manualmente." 
                      : "Esta lista se calcula dinámicamente al momento de enviar."}
                  </CardDescription>
                </div>
                {list.list_type === "personalizada" && (
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {list.list_type === "personalizada" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar empleado..." className="pl-10" />
                </div>
              )}

              {list.list_type === "personalizada" ? (
                <ResponsiveTable
                  columns={columns}
                  data={mockMembers}
                  getKey={(item) => item.id}
                  actions={(item) => (
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Quitar
                    </Button>
                  )}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <Users className="h-10 w-10 mb-3 opacity-20" />
                  <p>Los miembros de esta lista se calculan automáticamente <br />al momento de enviar el comunicado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
