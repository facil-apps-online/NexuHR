import { ReactNode, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { usePortalSlug } from '@/hooks/usePortalSlug';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import {
  Home, PenTool, ClipboardList, DollarSign, Award,
  User, LogOut, BookOpen, GraduationCap, ClipboardCheck, CalendarDays,
  Stethoscope, Shirt, ShieldAlert, HeartPulse, History, Inbox, Activity,
  LucideIcon, ChevronDown, Menu, Mail, FileText, Bell, FolderOpen,
} from 'lucide-react';
import { PortalNotificationBell } from './PortalNotificationBell';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type NavItem = { to: string; label: string; icon: LucideIcon; matchPrefixes?: string[] };

function pathMatches(pathname: string, item: NavItem) {
  if (item.matchPrefixes) return item.matchPrefixes.some((p) => pathname.startsWith(p));
  return pathname === item.to;
}

function SubNav({ tabs }: { tabs: { to: string; label: string; icon: LucideIcon }[] }) {
  const { pathname } = useLocation();
  return (
    <div className="border-b bg-background -mx-6 px-6 md:mx-0 md:px-0 md:border-0 md:bg-transparent">
      <div className="relative">
        <div className="flex gap-1 overflow-x-auto py-2 md:py-0 md:pb-4 scrollbar-none">
          {tabs.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + '/');
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-medium whitespace-nowrap transition',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-foreground',
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
      </div>
    </div>
  );
}

export function EmployeePortalLayout({ children }: { children: ReactNode }) {
  const { employee, signOut } = useEmployeePortalAuth();
  const { slug } = usePortalSlug();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: tenantInfo } = useQuery({
    queryKey: ['portal-tenant-info', employee?.tenant_id],
    queryFn: async () => {
      if (!employee?.tenant_id) return null;
      const { data } = await portalSupabase
        .from('tenants')
        .select('logo_url, name')
        .eq('id', employee.tenant_id)
        .single();
      return data || null;
    },
    enabled: !!employee?.tenant_id,
  });

  const tenantLogo = tenantInfo?.logo_url;

  const { displayUrl: logoSrc } = useGoogleDriveImage(tenantLogo || undefined, employee?.tenant_id);
  const { displayUrl: photoSrc } = useGoogleDriveImage(employee?.photo_url || undefined, employee?.tenant_id);
  const initials = employee ? `${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}` : '';

  const base = useMemo(() => `/${slug}`, [slug]);

  const navItems = useMemo<NavItem[]>(() => [
    { to: `${base}/inicio`, label: 'Inicio', icon: Home },
    {
      to: `${base}/pendientes/firmar`,
      label: 'Pendientes',
      icon: Inbox,
      matchPrefixes: [`${base}/pendientes`, `${base}/incapacidades`],
    },
    {
      to: `${base}/mi-actividad/cursos`,
      label: 'Mi actividad',
      icon: Activity,
      matchPrefixes: [
        `${base}/mi-actividad`,
        `${base}/cursos`,
        `${base}/evaluaciones`,
        `${base}/eventos`,
        `${base}/examenes`,
        `${base}/vigilancias`,
        `${base}/dotacion`,
      ],
    },
    { to: `${base}/desprendibles`, label: 'Desprendibles', icon: DollarSign },
    { to: `${base}/certificados`, label: 'Certificados', icon: Award },
    { to: `${base}/contrato`, label: 'Mi contrato', icon: FileText },
    { to: `${base}/comunicaciones`, label: 'Comunicaciones', icon: Mail },
    { to: `${base}/notificaciones`, label: 'Notificaciones', icon: Bell },
    { to: `${base}/mis-documentos`, label: 'Mis documentos', icon: FolderOpen },
    { to: `${base}/reglamento`, label: 'Reglamento', icon: BookOpen },
    { to: `${base}/historial`, label: 'Mi historial', icon: History },
    { to: `${base}/perfil`, label: 'Mi perfil', icon: User },
  ], [base]);

  const pendientesTabs = useMemo(() => [
    { to: `${base}/pendientes/firmar`, label: 'Por firmar', icon: PenTool },
    { to: `${base}/pendientes/hacer`, label: 'Por hacer', icon: ClipboardList },
    { to: `${base}/incapacidades`, label: 'Incapacidades', icon: HeartPulse },
  ], [base]);

  const actividadTabs = useMemo(() => [
    { to: `${base}/cursos`, label: 'Cursos', icon: GraduationCap },
    { to: `${base}/evaluaciones`, label: 'Evaluaciones', icon: ClipboardCheck },
    { to: `${base}/eventos`, label: 'Eventos', icon: CalendarDays },
    { to: `${base}/examenes`, label: 'Exámenes', icon: Stethoscope },
    { to: `${base}/vigilancias`, label: 'Vigilancia', icon: ShieldAlert },
    { to: `${base}/dotacion`, label: 'Dotación', icon: Shirt },
  ], [base]);

  const inPendientes =
    pathname.startsWith(`${base}/pendientes`) || pathname.startsWith(`${base}/incapacidades`);
  const inActividad = actividadTabs.some((t) => pathname === t.to || pathname.startsWith(t.to + '/'));

  const navContent = (onClick?: () => void) => (
    <nav className="flex flex-col gap-1">
      {navItems.map((it) => {
        const active = pathMatches(pathname, it);
        return (
          <NavLink
            key={it.to}
            to={it.to}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 min-h-[44px] font-medium transition',
              active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
            )}
          >
            <it.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" className="h-9 w-auto max-w-[120px] object-contain" />
          ) : null}
          {tenantInfo?.name && (
            <span className="font-semibold text-base">{tenantInfo.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PortalNotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition">
                <div className="text-right hidden sm:block">
                  <p className="font-semibold leading-tight">{employee?.first_name} {employee?.last_name}</p>
                  <p className="text-sm text-muted-foreground leading-tight">{employee?.position || 'Empleado'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary overflow-hidden">
                  {photoSrc ? <img src={photoSrc} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuItem asChild>
                <Link to={`/${slug}/perfil`} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" /> Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate(`/${slug}`); }} className="cursor-pointer text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>{tenantInfo?.name || 'Menú'}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {navContent(() => setMobileOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="hidden md:block md:sticky md:top-20 self-start">
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 scrollbar-none">
            {navContent()}
          </div>
        </aside>
        <main className="space-y-6 min-w-0">
          {inPendientes && <SubNav tabs={pendientesTabs} />}
          {inActividad && <SubNav tabs={actividadTabs} />}
          {children}
        </main>
      </div>
    </div>
  );
}
