import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResponsiveTable, ResponsiveColumn } from "@/components/ui/responsive-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Send, 
  Users, 
  ListChecks,
  Clock,
  CheckCircle2,
  Settings,
  Trash2
} from "lucide-react";
import { useCommunications, type Communication } from "@/hooks/useCommunications";
import { useDistributionLists, type DistributionList } from "@/hooks/useDistributionLists";
import { DistributionListFormModal } from "@/components/comunicaciones/DistributionListFormModal";
import { CommunicationForm } from "@/components/comunicaciones/CommunicationForm";
import { CommunicationDetailDialog } from "@/components/comunicaciones/CommunicationDetailDialog";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const estadoColor = {
  Enviado: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Programado: "bg-blue-500/10 text-blue-600 border-blue-200",
  Borrador: "bg-slate-500/10 text-slate-600 border-slate-200",
  Leido: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  Fallido: "bg-destructive/10 text-destructive border-destructive/20",
};

const columns: ResponsiveColumn<Communication>[] = [
  {
    key: "subject",
    label: "Asunto",
    primary: true,
    subtitle: true,
    render: (item) => item.subject,
  },
  {
    key: "type",
    label: "Tipo",
    render: (item) => item.communication_type,
  },
  {
    key: "recipients",
    label: "Destinatarios",
    hideOnMobile: true,
    render: (item) => item.recipients?.length || 0,
  },
  {
    key: "sent",
    label: "Enviados",
    hideOnMobile: true,
    render: (item) =>
      item.status === "enviado" || item.status === "leido" ? (
        <span className="text-emerald-600">{item.recipients?.length || 0}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    key: "read",
    label: "Leídos",
    hideOnMobile: true,
    render: (item) => {
      const enviados = item.recipients?.length || 0;
      const leidos = item.reads_count || 0;
      return (item.status === "enviado" || item.status === "leido") && enviados > 0 ? (
        <span>
          {leidos} ({Math.round((leidos / enviados) * 100)}%)
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    key: "date",
    label: "Fecha",
    render: (item) => item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy', { locale: es }) : '-',
  },
  {
    key: "status",
    label: "Estado",
    render: (item) => {
      const statusCapitalized = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Borrador";
      return (
      <Badge
        variant="outline"
        className={estadoColor[statusCapitalized as keyof typeof estadoColor] || estadoColor.Borrador}
      >
        {statusCapitalized}
      </Badge>
    )},
  },
];

export default function Comunicaciones() {
  const navigate = useNavigate();
  const { data: comunicacionesData = [], isLoading } = useCommunications();
  const { data: dashboardStats } = useDashboardStats();
  
  const { lists, createList, updateList, deleteList } = useDistributionLists();
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [showCommForm, setShowCommForm] = useState(false);
  const [editingComm, setEditingComm] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailComm, setDetailComm] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleSaveList = (list: Partial<DistributionList>) => {
    if (editingList) {
      updateList.mutate({ ...list, id: editingList.id }, {
        onSuccess: () => setListModalOpen(false)
      });
    } else {
      createList.mutate(list, {
        onSuccess: () => setListModalOpen(false)
      });
    }
  };

  const filteredComms = useMemo(() => comunicacionesData.filter(c => {
    if (search && !c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && c.communication_type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  }), [comunicacionesData, search, filterType, filterStatus]);

  const commStats = dashboardStats?.communications || {
    total: 0,
    enviado: 0,
    leido: 0,
    borrador: 0,
  };
  
  // Calculate delivery rate based on read vs sent (or something similar, depending on what stats mean)
  const deliveryRate = commStats.enviado && (commStats.enviado as number) > 0 
    ? Math.round(((commStats.leido as number) / (commStats.enviado as number)) * 100) 
    : 0;
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comunicaciones</h1>
            <p className="text-muted-foreground">
              Envío de correos masivos y gestión de listas de distribución
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => { setEditingComm(null); setShowCommForm(true); }}>
              <Plus className="h-4 w-4" />
              Nueva Comunicación
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{commStats.enviado}</p>
                  <p className="text-sm text-muted-foreground">Total Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deliveryRate}%</p>
                  <p className="text-sm text-muted-foreground">Tasa de Lectura</p>
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
                  <p className="text-2xl font-bold">{commStats.borrador}</p>
                  <p className="text-sm text-muted-foreground">Borradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lists.length}</p>
                  <p className="text-sm text-muted-foreground">Listas Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="comunicaciones" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comunicaciones" className="gap-2">
              <Send className="h-4 w-4" />
              Comunicaciones
            </TabsTrigger>
            <TabsTrigger value="listas" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Listas de Distribución
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comunicaciones" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar por asunto..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="memorando">Memorando</SelectItem>
                      <SelectItem value="notificacion">Notificación</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="borrador">Borrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Comunicaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveTable
                  columns={columns}
                  data={filteredComms}
                  getKey={(item) => String(item.id)}
                  actions={(item) => (
                    <Button variant="ghost" size="sm" onClick={() => { setDetailComm(item); setShowDetail(true); }}>
                      Ver Detalle
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listas" className="space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => { setEditingList(null); setListModalOpen(true); }}>
                <Plus className="h-4 w-4" />
                Nueva Lista
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lists.map((lista) => (
                <Card key={lista.id} className="hover:shadow-md transition-shadow relative group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{lista.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {lista.list_type} {lista.target_value ? `- ${lista.target_value}` : ''}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {lista.list_type === "personalizada" ? `${lista.members_count || 0} miembros` : "Dinámica"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {lista.description || "Sin descripción"}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingList(lista); setListModalOpen(true); }}>
                        Edición rápida
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/comunicaciones/listas/${lista.id}`)}>
                        Completa
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de eliminar esta lista?")) {
                          deleteList.mutate(lista.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {lists.length === 0 && (
                <div className="col-span-full py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  No hay listas de distribución configuradas.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DistributionListFormModal
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          list={editingList}
          onSave={handleSaveList}
          isSaving={createList.isPending || updateList.isPending}
        />

        <CommunicationForm
          open={showCommForm}
          onOpenChange={(o) => { setShowCommForm(o); if (!o) setEditingComm(null); }}
          communication={editingComm}
        />

        <CommunicationDetailDialog
          open={showDetail}
          onOpenChange={(o) => { setShowDetail(o); if (!o) setDetailComm(null); }}
          communication={detailComm}
        />
      </div>
    </MainLayout>
  );
}
