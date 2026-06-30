import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEmployeePortalAuth } from '@/hooks/useEmployeePortalAuth';
import { Button } from '@/components/ui/button';
import {
  Home, PenTool, ClipboardList, DollarSign, Award,
  User, LogOut, BookOpen, GraduationCap, ClipboardCheck, CalendarDays,
  Stethoscope, Shirt, ShieldAlert, HeartPulse, History, Inbox, Activity,
  LucideIcon,
} from 'lucide-react';
import { PortalNotificationBell } from './PortalNotificationBell';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: LucideIcon; matchPrefixes?: string[] };

const navItems: NavItem[] = [
  { to: '/Funcionarios/inicio', label: 'Inicio', icon: Home },
  {
    to: '/Funcionarios/pendientes/firmar',
    label: 'Pendientes',
    icon: Inbox,
    matchPrefixes: ['/Funcionarios/pendientes', '/Funcionarios/incapacidades'],
  },
  {
    to: '/Funcionarios/mi-actividad/cursos',
    label: 'Mi actividad',
    icon: Activity,
    matchPrefixes: [
      '/Funcionarios/mi-actividad',
      '/Funcionarios/cursos',
      '/Funcionarios/evaluaciones',
      '/Funcionarios/eventos',
      '/Funcionarios/examenes',
      '/Funcionarios/vigilancias',
      '/Funcionarios/dotacion',
    ],
  },
  { to: '/Funcionarios/desprendibles', label: 'Desprendibles', icon: DollarSign },
  { to: '/Funcionarios/certificados', label: 'Certificados', icon: Award },
  { to: '/Funcionarios/reglamento', label: 'Reglamento', icon: BookOpen },
  { to: '/Funcionarios/historial', label: 'Mi historial', icon: History },
  { to: '/Funcionarios/perfil', label: 'Mi perfil', icon: User },
];

const pendientesTabs = [
  { to: '/Funcionarios/pendientes/firmar', label: 'Por firmar', icon: PenTool },
  { to: '/Funcionarios/pendientes/hacer', label: 'Por hacer', icon: ClipboardList },
  { to: '/Funcionarios/incapacidades', label: 'Incapacidades', icon: HeartPulse },
];

const actividadTabs = [
  { to: '/Funcionarios/cursos', label: 'Cursos', icon: GraduationCap },
  { to: '/Funcionarios/evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
  { to: '/Funcionarios/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/Funcionarios/examenes', label: 'Exámenes', icon: Stethoscope },
  { to: '/Funcionarios/vigilancias', label: 'Vigilancia', icon: ShieldAlert },
  { to: '/Funcionarios/dotacion', label: 'Dotación', icon: Shirt },
];

function pathMatches(pathname: string, item: NavItem) {
  if (item.matchPrefixes) return item.matchPrefixes.some((p) => pathname.startsWith(p));
  return pathname === item.to;
}

function SubNav({ tabs }: { tabs: { to: string; label: string; icon: LucideIcon }[] }) {
  const { pathname } = useLocation();
  return (
    <div className="border-b bg-background -mx-6 px-6 md:mx-0 md:px-0 md:border-0 md:bg-transparent">
      <div className="flex gap-1 overflow-x-auto py-2 md:py-0 md:pb-4">
        {tabs.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + '/');
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-foreground',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function EmployeePortalLayout({ children }: { children: ReactNode }) {
  const { employee, signOut } = useEmployeePortalAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initials = employee ? `${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}` : '';

  const inPendientes =
    pathname.startsWith('/Funcionarios/pendientes') || pathname.startsWith('/Funcionarios/incapacidades');
  const inActividad = actividadTabs.some((t) => pathname === t.to || pathname.startsWith(t.to + '/'));

  return (
    <div className="min-h-screen bg-muted/30 text-[16px]">
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary overflow-hidden">
              {employee?.photo_url ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div>
              <p className="font-semibold leading-tight">{employee?.first_name} {employee?.last_name}</p>
              <p className="text-sm text-muted-foreground leading-tight">{employee?.position || 'Empleado'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PortalNotificationBell />
            <Button variant="ghost" size="lg" onClick={async () => { await signOut(); navigate('/Funcionarios'); }}>
              <LogOut className="h-5 w-5 mr-2" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="md:sticky md:top-20 self-start">
          <nav className="grid grid-cols-2 md:grid-cols-1 gap-2 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
            {navItems.map((it) => {
              const active = pathMatches(pathname, it);
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition',
                    active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
                  )}
                >
                  <it.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </NavLink>
              );
            })}
          </nav>
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
