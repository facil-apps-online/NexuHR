import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { safeNewDate } from "@/lib/utils";
import {
  Plus, Search, Banknote, FileText, Users, Loader2, FileX,
  Upload, Download, ScrollText, Calendar,
} from "lucide-react";
import { ContractForm } from "@/components/nomina/ContractForm";
import { ContractBulkUpload } from "@/components/nomina/ContractBulkUpload";
import { PayrollItemForm } from "@/components/nomina/PayrollItemForm";
import { PayrollItemsBulkUpload } from "@/components/nomina/PayrollItemsBulkUpload";
import { PayslipItemsDialog } from "@/components/nomina/PayslipItemsDialog";
import { CertificateTemplateForm } from "@/components/nomina/CertificateTemplateForm";
import { CertificateGenerator } from "@/components/nomina/CertificateGenerator";
import { BulkCertificateGenerator } from "@/components/nomina/BulkCertificateGenerator";
import { PeriodForm } from "@/components/nomina/PeriodForm";

const periodStatusColor: Record<string, string> = {
  abierto: "bg-success/10 text-success border-success/20",
  cerrado: "bg-muted text-muted-foreground",
};

export default function Nomina() {
  const [activeTab, setActiveTab] = useState("nomina");
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [showContractForm, setShowContractForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showCertTemplateForm, setShowCertTemplateForm] = useState(false);
  const [showCertGenerator, setShowCertGenerator] = useState(false);
  const [showBulkCertGenerator, setShowBulkCertGenerator] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [showContractBulkUpload, setShowContractBulkUpload] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<{ employeeId: string; periodId: string } | null>(null);

  const { data: periods } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Query payroll_items grouped by employee+period
  const { data: payrollSummary, isLoading } = useQuery({
    queryKey: ["payroll-items-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_items" as any)
        .select("*, employees!payroll_items_employee_id_fkey(first_name, last_name, position, department), payroll_periods!payroll_items_period_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by employee_id + period_id
      const grouped = new Map<string, any>();
      (data as any[]).forEach((item: any) => {
        const key = `${item.employee_id}__${item.period_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            employee_id: item.employee_id,
            period_id: item.period_id,
            employee: item.employees,
            period: item.payroll_periods,
            payment_date: item.payment_date,
            totalDev: 0,
            totalDed: 0,
          });
        }
        const g = grouped.get(key)!;
        if (item.type === "DEV") g.totalDev += item.value || 0;
        else g.totalDed += item.value || 0;
        if (item.payment_date) g.payment_date = item.payment_date;
      });

      return Array.from(grouped.values());
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ["employee-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contracts")
        .select("*, employees!employee_contracts_employee_id_fkey(first_name, last_name, position, department)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: certTemplates } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPayroll = payrollSummary?.filter((r: any) => {
    const matchesSearch = !searchTerm ||
      `${r.employee?.first_name} ${r.employee?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = periodFilter === "all" || r.period_id === periodFilter;
    return matchesSearch && matchesPeriod;
  });

  const stats = {
    totalContracts: contracts?.filter((c: any) => c.active).length || 0,
    totalPayrolls: payrollSummary?.length || 0,
    totalTemplates: certTemplates?.length || 0,
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nómina</h1>
            <p className="text-muted-foreground">
              Gestión de períodos, contratos, nómina y certificaciones laborales
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeTab === "nomina" && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setShowBulkUpload(true)}>
                  <Upload className="h-4 w-4" />
                  Carga Masiva
                </Button>
                <Button className="gap-2" onClick={() => setShowPayrollForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo Registro
                </Button>
              </>
            )}
            {activeTab === "periodos" && (
              <Button className="gap-2" onClick={() => setShowPeriodForm(true)}>
                <Plus className="h-4 w-4" />
                Nuevo Período
              </Button>
            )}
            {activeTab === "contratos" && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setShowContractBulkUpload(true)}>
                  <Upload className="h-4 w-4" />
                  Carga Masiva
                </Button>
                <Button className="gap-2" onClick={() => setShowContractForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo Contrato
                </Button>
              </>
            )}
            {activeTab === "certificaciones" && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setShowBulkCertGenerator(true)}>
                  <Users className="h-4 w-4" />
                  Masiva
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setShowCertGenerator(true)}>
                  <Download className="h-4 w-4" />
                  Individual
                </Button>
                <Button className="gap-2" onClick={() => setShowCertTemplateForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nueva Plantilla
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="nomina" className="gap-2">
              <Banknote className="h-4 w-4" />
              Nómina
            </TabsTrigger>
            <TabsTrigger value="periodos" className="gap-2">
              <Calendar className="h-4 w-4" />
              Períodos
            </TabsTrigger>
            <TabsTrigger value="contratos" className="gap-2">
              <FileText className="h-4 w-4" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="certificaciones" className="gap-2">
              <ScrollText className="h-4 w-4" />
              Certificaciones
            </TabsTrigger>
          </TabsList>

          {/* NÓMINA TAB */}
          <TabsContent value="nomina" className="space-y-6 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3"><Banknote className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPayrolls}</p>
                      <p className="text-sm text-muted-foreground">Liquidaciones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-warning/10 p-3"><FileText className="h-6 w-6 text-warning" /></div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalContracts}</p>
                      <p className="text-sm text-muted-foreground">Contratos Activos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3"><ScrollText className="h-6 w-6 text-muted-foreground" /></div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalTemplates}</p>
                      <p className="text-sm text-muted-foreground">Plantillas Cert.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar empleado..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      {periods?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Registros de Nómina</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : !filteredPayroll?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay registros de nómina</p>
                  </div>
                ) : (
                  <ResponsiveTable
                    data={filteredPayroll || []}
                    getKey={(r: any) => `${r.employee_id}__${r.period_id}`}
                    emptyMessage="No hay registros de nómina"
                    actions={(r: any) => (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPayslip({ employeeId: r.employee_id, periodId: r.period_id })}>
                        Desprendible
                      </Button>
                    )}
                    columns={[
                      { key: "employee", label: "Empleado", primary: true, render: (r: any) => `${r.employee?.first_name} ${r.employee?.last_name}` },
                      { key: "period", label: "Período", subtitle: true, render: (r: any) => r.period?.name || "—" },
                      { key: "devengado", label: "Devengado", className: "text-right text-success", headerClassName: "text-right", render: (r: any) => formatCurrency(r.totalDev) },
                      { key: "deducciones", label: "Deducciones", className: "text-right text-destructive", headerClassName: "text-right", render: (r: any) => formatCurrency(r.totalDed) },
                      { key: "neto", label: "Neto", className: "text-right font-bold", headerClassName: "text-right", render: (r: any) => formatCurrency(r.totalDev - r.totalDed) },
                    ] as ResponsiveColumn<any>[]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERÍODOS TAB */}
          <TabsContent value="periodos" className="space-y-6 mt-4">
            <Card>
              <CardHeader><CardTitle>Períodos de Pago</CardTitle></CardHeader>
              <CardContent>
                {!periods?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay períodos creados</p>
                    <p className="text-sm mt-1">Crea un período antes de cargar registros de nómina</p>
                  </div>
                ) : (
                  <ResponsiveTable
                    data={periods || []}
                    getKey={(p: any) => p.id}
                    emptyMessage="No hay períodos creados"
                    columns={[
                      { key: "name", label: "Nombre", primary: true, render: (p: any) => p.name },
                      { key: "frequency", label: "Frecuencia", render: (p: any) => (
                        <Badge variant="outline">
                          {p.frequency === "mensual" ? "Mensual" : p.frequency === "quincenal" ? "Quincenal" : "Semanal"}
                        </Badge>
                      )},
                      { key: "startDate", label: "Inicio", render: (p: any) => format(safeNewDate(p.start_date), "d MMM yyyy", { locale: es }) },
                      { key: "endDate", label: "Fin", render: (p: any) => format(safeNewDate(p.end_date), "d MMM yyyy", { locale: es }) },
                      { key: "paymentDate", label: "Fecha Pago", hideOnMobile: true, render: (p: any) => p.payment_date ? format(safeNewDate(p.payment_date), "d MMM yyyy", { locale: es }) : "—" },
                      { key: "status", label: "Estado", render: (p: any) => (
                        <Badge variant="outline" className={periodStatusColor[p.status] || ""}>
                          {p.status === "abierto" ? "Abierto" : "Cerrado"}
                        </Badge>
                      )},
                    ] as ResponsiveColumn<any>[]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTRATOS TAB */}
          <TabsContent value="contratos" className="space-y-6 mt-4">
            <Card>
              <CardHeader><CardTitle>Contratos de Empleados</CardTitle></CardHeader>
              <CardContent>
                {!contracts?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay contratos registrados</p>
                  </div>
                ) : (
                  <ResponsiveTable
                    data={contracts || []}
                    getKey={(c: any) => c.id}
                    emptyMessage="No hay contratos registrados"
                    columns={[
                      { key: "employee", label: "Empleado", primary: true, render: (c: any) => `${c.employees?.first_name} ${c.employees?.last_name}` },
                      { key: "type", label: "Tipo", subtitle: true, render: (c: any) => (
                        <Badge variant="outline">
                          {c.contract_type === "indefinido" ? "Indefinido" :
                            c.contract_type === "fijo" ? "Fijo" :
                            c.contract_type === "obra_labor" ? "Obra/Labor" : c.contract_type}
                        </Badge>
                      )},
                      { key: "startDate", label: "Inicio", render: (c: any) => format(safeNewDate(c.start_date), "d MMM yyyy", { locale: es }) },
                      { key: "salary", label: "Salario Base", className: "text-right font-medium", headerClassName: "text-right", render: (c: any) => formatCurrency(c.base_salary) },
                      { key: "frequency", label: "Frecuencia", hideOnMobile: true, render: (c: any) => c.payment_frequency === "mensual" ? "Mensual" : c.payment_frequency === "quincenal" ? "Quincenal" : c.payment_frequency },
                      { key: "status", label: "Estado", render: (c: any) => (
                        <Badge variant={c.active ? "default" : "secondary"}>
                          {c.active ? "Activo" : "Inactivo"}
                        </Badge>
                      )},
                    ] as ResponsiveColumn<any>[]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CERTIFICACIONES TAB */}
          <TabsContent value="certificaciones" className="space-y-6 mt-4">
            <Card>
              <CardHeader><CardTitle>Plantillas de Certificación</CardTitle></CardHeader>
              <CardContent>
                {!certTemplates?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileX className="h-12 w-12 mb-2" /><p>No hay plantillas de certificación</p>
                    <p className="text-sm mt-1">Crea una plantilla para generar certificaciones laborales</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {certTemplates.map((t: any) => (
                      <Card key={t.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{t.name}</CardTitle>
                            <Badge variant={t.active ? "default" : "secondary"}>
                              {t.active ? "Activa" : "Inactiva"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground line-clamp-3">{t.content_template}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Tipo: {t.template_type === "laboral" ? "Certificación Laboral" : t.template_type}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ContractForm open={showContractForm} onOpenChange={setShowContractForm} />
      <ContractBulkUpload open={showContractBulkUpload} onOpenChange={setShowContractBulkUpload} />
      <PayrollItemForm open={showPayrollForm} onOpenChange={setShowPayrollForm} />
      <PayrollItemsBulkUpload open={showBulkUpload} onOpenChange={setShowBulkUpload} />
      <CertificateTemplateForm open={showCertTemplateForm} onOpenChange={setShowCertTemplateForm} />
      <CertificateGenerator open={showCertGenerator} onOpenChange={setShowCertGenerator} />
      <BulkCertificateGenerator open={showBulkCertGenerator} onOpenChange={setShowBulkCertGenerator} />
      <PeriodForm open={showPeriodForm} onOpenChange={setShowPeriodForm} />
      <PayslipItemsDialog
        open={!!selectedPayslip}
        onOpenChange={(v) => { if (!v) setSelectedPayslip(null); }}
        employeeId={selectedPayslip?.employeeId || null}
        periodId={selectedPayslip?.periodId || null}
      />
    </MainLayout>
  );
}
