import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

export default function PortalDesprendibles() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;
  const { data, isLoading } = useQuery({
    queryKey: ['portal-payroll', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('payroll_records')
        .select('id, payment_date, net_pay, total_earnings, total_deductions, status')
        .eq('employee_id', eid!)
        .order('payment_date', { ascending: false });
      return data || [];
    },
  });

  const downloadPDF = (record: any) => {
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : '';
    const employeeDoc = employee?.document_number || '';
    const earnings = Number(record.total_earnings ?? 0).toLocaleString('es-CO');
    const deductions = Number(record.total_deductions ?? 0).toLocaleString('es-CO');
    const netPay = Number(record.net_pay ?? 0).toLocaleString('es-CO');

    const html = `
      <html><head><title>Desprendible - ${record.payment_date}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 48px; max-width: 600px; margin: auto; color: #111; line-height: 1.5; }
        h1 { text-align: center; font-size: 20px; margin-bottom: 8px; }
        h2 { text-align: center; font-size: 14px; color: #666; font-weight: normal; margin-top: 0; }
        .info { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .total { font-weight: bold; font-size: 15px; }
        .net { background: #f0fdf4; }
        @media print { body { padding: 24px; } }
      </style></head><body>
        <h1>Desprendible de Pago</h1>
        <h2>${employeeName}</h2>
        <div class="info">
          <span>Documento: ${employeeDoc}</span>
          <span>Fecha de pago: ${record.payment_date}</span>
        </div>
        <table>
          <tr><th>Concepto</th><th style="text-align:right">Valor</th></tr>
          <tr><td>Devengado</td><td style="text-align:right">$${earnings}</td></tr>
          <tr><td>Deducciones</td><td style="text-align:right">-$${deductions}</td></tr>
          <tr class="net"><td class="total">Neto pagado</td><td style="text-align:right" class="total">$${netPay}</td></tr>
        </table>
        <p style="text-align:center;color:#888;font-size:11px;margin-top:32px">Generado desde NexuHR.pro</p>
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mis desprendibles de pago</h1>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : data?.length === 0 ? (
        <p className="text-muted-foreground">Aún no tienes desprendibles registrados.</p>
      ) : (
        <div className="space-y-3">
          {data?.map((r) => (
            <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{r.payment_date}</p>
                <p className="text-sm text-muted-foreground">Devengado: ${Number(r.total_earnings ?? 0).toLocaleString('es-CO')} · Deducciones: ${Number(r.total_deductions ?? 0).toLocaleString('es-CO')}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold text-primary">${Number(r.net_pay ?? 0).toLocaleString('es-CO')}</p>
                <Button size="sm" variant="outline" onClick={() => downloadPDF(r)}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </EmployeePortalLayout>
  );
}
