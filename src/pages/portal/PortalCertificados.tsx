import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PortalCertificados() {
  const { employee } = useEmployeePortalAuth();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['portal-cert-templates', employee?.tenant_id],
    enabled: !!employee,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('certificate_templates')
        .select('id, name, template_type, content_template')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: contract } = useQuery({
    queryKey: ['portal-current-contract', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('employee_contracts')
        .select('*')
        .eq('employee_id', employee!.id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const render = (template: any) => {
    if (!employee) return '';
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
    const vars: Record<string, string> = {
      nombre: `${employee.first_name} ${employee.last_name}`,
      nombre_empleado: `${employee.first_name} ${employee.last_name}`,
      documento: employee.document_number || '',
      cargo: employee.position || contract?.position || '',
      area: employee.department || '',
      fecha: today,
      fecha_actual: today,
      salario: contract?.base_salary != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(contract.base_salary) : '',
      tipo_contrato: contract?.contract_type || '',
      fecha_ingreso: contract?.start_date || '',
    };
    let html = template.content_template || '';
    Object.entries(vars).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v);
    });
    return html;
  };

  const openPreview = (t: any) => {
    setPreviewTitle(t.name);
    setPreviewHtml(render(t));
  };

  const printCert = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w || !previewHtml) return;
    w.document.write(`<html><head><title>${previewTitle}</title><style>body{font-family:Georgia,serif;padding:48px;max-width:800px;margin:auto;line-height:1.6;color:#111}h1,h2{text-align:center}</style></head><body>${previewHtml}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis certificados laborales</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : templates.length === 0 ? (
        <Card className="p-6 text-muted-foreground">Tu empresa aún no ha habilitado plantillas de certificado.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.template_type}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => openPreview(t)}>
                <Download className="h-4 w-4 mr-2" /> Generar
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewHtml} onOpenChange={(o) => !o && setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewTitle}</DialogTitle></DialogHeader>
          <div className="prose prose-sm max-w-none border rounded p-4 bg-background" dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setPreviewHtml(null)}>Cerrar</Button>
            <Button onClick={printCert}><Printer className="h-4 w-4 mr-2" /> Imprimir / Guardar PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeePortalLayout>
  );
}
