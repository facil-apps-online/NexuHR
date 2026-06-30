import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { HeartPulse, Plus, Loader2, FileX, Download } from 'lucide-react';
import { format } from 'date-fns';
import { IncapacidadForm } from '@/components/incapacidades/IncapacidadForm';
import { toast } from 'sonner';

const estadoBadge: Record<string, JSX.Element> = {
  registrada: <Badge variant="secondary">Registrada</Badge>,
  en_revision: <Badge className="bg-warning/10 text-warning border-warning/20">En revisión</Badge>,
  aprobada: <Badge className="bg-success/10 text-success border-success/20">Aprobada</Badge>,
  rechazada: <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rechazada</Badge>,
  transcrita_nomina: <Badge className="bg-primary/10 text-primary border-primary/20">Transcrita</Badge>,
};

export function EmpleadoIncapacidades({ employeeId }: { employeeId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-incapacidades', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incapacidades' as any)
        .select('*')
        .eq('employee_id', employeeId)
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage.from('incapacidades').createSignedUrl(path, 60);
    if (error) { toast.error('No se pudo descargar'); return; }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              Incapacidades y licencias
            </CardTitle>
            <Button size="sm" className="gradient-primary" onClick={() => { setSelected(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !data || data.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-muted-foreground">
              <FileX className="h-12 w-12 mb-2" /><p>Sin incapacidades registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((i: any) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => { setSelected(i); setShowForm(true); }}>
                    <TableCell className="capitalize">{i.tipo.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{format(new Date(i.fecha_inicio), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(i.fecha_fin), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{i.dias}</TableCell>
                    <TableCell>{estadoBadge[i.estado]}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {i.documento_url && (
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(i.documento_url)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IncapacidadForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setSelected(null); }}
        incapacidad={selected}
        defaultEmployeeId={employeeId}
      />
    </>
  );
}
