import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Printer, FileText, Users, Download, Loader2, AlertTriangle } from "lucide-react";
import { useReportApi } from "@/hooks/useReportApi";
import { useReportingIntegration } from "@/hooks/useReportingIntegration";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function BulkCertificateGenerator({ open, onOpenChange }: Props) {
  const [templateId, setTemplateId] = useState("");
  const [dirigidaA, setDirigidaA] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<{ name: string; content: string }[]>([]);
  const { data: integration } = useReportingIntegration();

  const { generatePdf, loading: generatingPdf } = useReportApi({
    apiUrl: integration?.apiUrl || "",
    apiKey: integration?.apiKey || "",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, document_type, document_number, hire_date")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: templates } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificate_templates").select("*").eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: contracts } = useQuery({
    queryKey: ["all-active-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_contracts")
        .select("employee_id, base_salary, contract_type, start_date, position, department")
        .eq("active", true);
      return data;
    },
    enabled: open,
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").limit(1).maybeSingle();
      if (!profile?.tenant_id) return null;
      const { data } = await supabase.from("tenants").select("name, logo_url").eq("id", profile.tenant_id).single();
      return data;
    },
    enabled: open,
  });

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedEmployees(
      selectedEmployees.length === employees?.length ? [] : employees?.map(e => e.id) || []
    );
  };

  const template = templates?.find(t => t.id === templateId);
  const contractMap = new Map(contracts?.map(c => [c.employee_id, c]) || []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

  const generate = () => {
    if (!template || !selectedEmployees.length) return;
    const now = new Date();

    const results = selectedEmployees.map(empId => {
      const emp = employees?.find(e => e.id === empId);
      if (!emp) return null;
      const contract = contractMap.get(empId);
      const salary = contract?.base_salary || 0;

      const content = template.content_template
        .replace(/\{\{nombre_empleado\}\}/g, `${emp.first_name} ${emp.last_name}`)
        .replace(/\{\{tipo_documento\}\}/g, emp.document_type || "CC")
        .replace(/\{\{numero_documento\}\}/g, emp.document_number || "")
        .replace(/\{\{cargo\}\}/g, contract?.position || "N/A")
        .replace(/\{\{departamento\}\}/g, contract?.department || "N/A")
        .replace(/\{\{fecha_inicio\}\}/g, contract?.start_date || emp.hire_date || "N/A")
        .replace(/\{\{tipo_contrato\}\}/g, contract?.contract_type || "N/A")
        .replace(/\{\{salario_base\}\}/g, formatCurrency(salary))
        .replace(/\{\{salario_letras\}\}/g, "")
        .replace(/\{\{empresa\}\}/g, tenant?.name || "La Empresa")
        .replace(/\{\{dirigida_a\}\}/g, dirigidaA || "A QUIEN INTERESE")
        .replace(/\{\{dia\}\}/g, now.getDate().toString())
        .replace(/\{\{mes\}\}/g, monthNames[now.getMonth()])
        .replace(/\{\{año\}\}/g, now.getFullYear().toString());

      return { name: `${emp.first_name} ${emp.last_name}`, content };
    }).filter(Boolean) as { name: string; content: string }[];

    setGeneratedContent(results);
    toast.success(`${results.length} certificaciones generadas`);
  };

  const printAll = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const logoHtml = tenant?.logo_url
      ? `<img src="${tenant.logo_url}" style="height:60px;margin:0 auto 10px;display:block;" />`
      : "";
    const pages = generatedContent.map(c => `
      <div style="page-break-after:always;padding:40px;font-family:serif;">
        ${logoHtml}
        ${c.content}
      </div>
    `).join("");
    printWindow.document.write(`<html><head><title>Certificaciones</title><style>
      body { margin:0; } p { margin: 0.3em 0; } div { font-size:14px; line-height:1.8; }
    </style></head><body>${pages}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const isRepxTemplate = template?.template_type === "repx";
  const isConfigured = integration?.isConfigured && integration?.apiKey;

  const handleGenerateAllPdf = async () => {
    if (!template || !selectedEmployees.length) return;

    if (!isConfigured) {
      toast.error("La API de reportes no está configurada. Ve a Configuración → Integraciones.");
      return;
    }

    try {
      for (const empId of selectedEmployees) {
        const emp = employees?.find(e => e.id === empId);
        if (!emp) continue;

        const contract = contractMap.get(empId);
        const salary = contract?.base_salary || 0;
        const now = new Date();

        const data = {
          nombre_empleado: `${emp.first_name} ${emp.last_name}`,
          tipo_documento: emp.document_type || "CC",
          numero_documento: emp.document_number || "",
          cargo: contract?.position || "N/A",
          departamento: contract?.department || "N/A",
          fecha_inicio: contract?.start_date || emp.hire_date || "N/A",
          tipo_contrato: contract?.contract_type || "N/A",
          salario_base: formatCurrency(salary),
          salario_letras: "",
          empresa: tenant?.name || "La Empresa",
          dirigida_a: dirigidaA || "A QUIEN INTERESE",
          dia: now.getDate().toString(),
          mes: monthNames[now.getMonth()],
          año: now.getFullYear().toString(),
        };

        const result = await generatePdf({
          templateKey: template.name.replace(/\s+/g, '-').toLowerCase(),
          data,
          asBase64: false,
        });

        if (result instanceof Blob) {
          const url = URL.createObjectURL(result);
          const a = document.createElement("a");
          a.href = url;
          a.download = `certificacion-${emp.first_name}-${emp.last_name}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      toast.success(`${selectedEmployees.length} PDFs generados`);
    } catch (error) {
      toast.error("Error al generar los PDFs");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Generación Masiva de Certificaciones
          </DialogTitle>
          <DialogDescription>Los datos se toman del contrato activo de cada empleado</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger>
                <SelectContent>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirigida a (opcional)</Label>
              <Input
                value={dirigidaA}
                onChange={e => setDirigidaA(e.target.value)}
                placeholder="A QUIEN INTERESE"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Empleados ({selectedEmployees.length} seleccionados)</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedEmployees.length === employees?.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </Button>
            </div>
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              {employees?.map(e => {
                const hasContract = contractMap.has(e.id);
                return (
                  <div key={e.id} className="flex items-center gap-3 py-1.5">
                    <Checkbox
                      checked={selectedEmployees.includes(e.id)}
                      onCheckedChange={() => toggleEmployee(e.id)}
                    />
                    <span className="text-sm">{e.first_name} {e.last_name}</span>
                    {!hasContract && (
                      <span className="text-xs text-destructive">Sin contrato</span>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          </div>

          {isRepxTemplate && !isConfigured && (
            <div className="border rounded-lg p-3 bg-destructive/10 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">API de reportes no configurada</p>
                <p>Ve a Configuración → Integraciones para configurar la conexión.</p>
              </div>
            </div>
          )}

          {generatedContent.length > 0 && !isRepxTemplate && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {generatedContent.length} certificaciones listas
              </p>
              <div className="text-xs space-y-1">
                {generatedContent.map((c, i) => <p key={i}>✓ {c.name}</p>)}
              </div>
            </div>
          )}

          {isRepxTemplate && isConfigured && selectedEmployees.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30 text-sm text-center">
              <p>{selectedEmployees.length} empleados seleccionados. Los PDFs se generarán dinámicamente.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          {generatedContent.length > 0 && !isRepxTemplate && (
            <Button variant="outline" className="gap-2" onClick={printAll}>
              <Printer className="h-4 w-4" />
              Imprimir Todas
            </Button>
          )}
          {isRepxTemplate ? (
            <Button
              onClick={handleGenerateAllPdf}
              disabled={!templateId || !selectedEmployees.length || generatingPdf || !isConfigured}
              className="gap-2"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Generar PDFs ({selectedEmployees.length})
            </Button>
          ) : (
            <Button onClick={generate} disabled={!templateId || !selectedEmployees.length} className="gap-2">
              <FileText className="h-4 w-4" />
              Generar ({selectedEmployees.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
