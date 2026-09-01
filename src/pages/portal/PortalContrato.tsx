import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { EmployeePortalLayout } from '@/components/portal/EmployeePortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, Clock, DollarSign, FileText, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PortalContrato() {
  const { employee } = useEmployeePortalAuth();
  const eid = employee?.id;

  const { data: contract, isLoading } = useQuery({
    queryKey: ['portal-contract', eid],
    enabled: !!eid,
    queryFn: async () => {
      const { data } = await portalSupabase
        .from('employee_contracts')
        .select('*')
        .eq('employee_id', eid!)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const contractTypeLabel: Record<string, string> = {
    indefinido: 'Contrato a término indefinido',
    fijo: 'Contrato a término fijo',
    obra_labor: 'Contrato por obra o labor',
    prestacion_servicios: 'Contrato de prestación de servicios',
    aprendizaje: 'Contrato de aprendizaje',
  };

  const frequencyLabel: Record<string, string> = {
    quincenal: 'Quincenal',
    mensual: 'Mensual',
    semanal: 'Semanal',
    diario: 'Diario',
  };

  return (
    <EmployeePortalLayout>
      <h1 className="text-2xl font-bold">Mi contrato laboral</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando información contractual...</p>
      ) : !contract ? (
        <Card className="p-6 text-muted-foreground">
          No se encontró un contrato registrado. Contacta a tu empresa si crees que esto es un error.
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Tipo de contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {contractTypeLabel[contract.contract_type] || contract.contract_type}
              </p>
              <Badge variant={contract.active ? 'default' : 'secondary'} className="mt-2">
                {contract.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de ingreso</p>
                    <p className="font-semibold">
                      {contract.start_date
                        ? format(new Date(contract.start_date), "dd 'de' MMMM 'de' yyyy", { locale: es })
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {contract.end_date && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de finalización</p>
                      <p className="font-semibold">
                        {format(new Date(contract.end_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salario base</p>
                    <p className="font-semibold">
                      {contract.base_salary
                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: contract.currency || 'COP', maximumFractionDigits: 0 }).format(contract.base_salary)
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frecuencia de pago</p>
                    <p className="font-semibold">{frequencyLabel[contract.payment_frequency] || contract.payment_frequency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <Briefcase className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-semibold">{contract.position || employee?.position || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-purple-500/10 p-3">
                    <Timer className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horas por semana</p>
                    <p className="font-semibold">{contract.work_hours_per_week || '48'}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {contract.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{contract.observations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </EmployeePortalLayout>
  );
}
