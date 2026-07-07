import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  Stethoscope,
  ShieldCheck,
  Shirt,
  UserCheck,
  FileSignature,
  PenTool,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  ClipboardCheck,
  Banknote,
  BookOpen,
  Mail,
  HeartPulse,
  Monitor,
  HardDrive,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDriveImage } from "@/hooks/useGoogleDriveImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSidebarState } from "./MainLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import nexurhIcon from "@/assets/nexurh-icon.svg";

const formatStorage = (value: number) => `${value} GB`;

const StorageIndicator = ({ collapsed }: { collapsed: boolean }) => {
  const { currentAssignment } = useAuth();
  const { data: subscription } = useSubscriptionUsage(currentAssignment?.tenant_id, currentAssignment?.platform_id);

  const storageAsset = subscription?.usage.find(item => item.asset_purpose_key === "storage");
  if (!storageAsset) return null;

  const totalSize = storageAsset.used;
  const storageLimit = storageAsset.limit;
  const usagePercentage = storageLimit > 0 ? Math.min((totalSize / storageLimit) * 100, 100) : 0;

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center py-2">
              <HardDrive className="h-5 w-5 text-sidebar-foreground/60" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <p className="font-semibold">Almacenamiento</p>
            <p>{formatStorage(totalSize)} / {formatStorage(storageLimit)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <HardDrive className="h-4 w-4 text-sidebar-foreground/60" />
        <span className="text-xs font-semibold text-sidebar-foreground/60">Almacenamiento</span>
      </div>
      <Progress value={usagePercentage} className="h-2" />
      <p className="text-xs text-sidebar-foreground/40 mt-1 text-center">
        {formatStorage(totalSize)} / {formatStorage(storageLimit)}
      </p>
    </div>
  );
};

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  moduleCode?: string;
  adminOnly?: boolean;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: "Gestión Humana",
    items: [
      { name: "Empleados", href: "/empleados", icon: Users, moduleCode: "empleados" },
      { name: "Cursos", href: "/cursos", icon: GraduationCap, moduleCode: "cursos" },
    ],
  },
  {
    label: "SG-SST",
    items: [
      { name: "Comités", href: "/comites", icon: UserCheck, moduleCode: "comites" },
      { name: "Eventos", href: "/eventos", icon: FileSignature, moduleCode: "eventos" },
      { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck, moduleCode: "evaluaciones" },
    ],
  },
  {
    label: "Salud",
    items: [
      { name: "Exámenes Médicos", href: "/examenes", icon: Stethoscope, moduleCode: "examenes" },
      { name: "Vigilancias", href: "/vigilancias", icon: ShieldCheck, moduleCode: "vigilancias" },
      { name: "Incapacidades", href: "/incapacidades", icon: HeartPulse, moduleCode: "incapacidades" },
    ],
  },
  {
    label: "Recursos",
    items: [
      { name: "Activos Fijos", href: "/activos-fijos", icon: Monitor, moduleCode: "activos_fijos" },
      { name: "Dotación", href: "/dotacion", icon: Shirt, moduleCode: "dotacion" },
    ],
  },
  {
    label: "Procesos",
    items: [
      { name: "Comunicaciones", href: "/comunicaciones", icon: Mail, moduleCode: "comunicaciones" },
      { name: "Centro de Firmas", href: "/firmas", icon: PenTool, moduleCode: "firmas" },
      { name: "Nómina", href: "/nomina", icon: Banknote, moduleCode: "nomina" },
      { name: "Reglamento", href: "/reglamento", icon: BookOpen, moduleCode: "reglamento" },
    ],
  },
];

const bottomNav: NavItem[] = [
  { name: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
  const state = useSidebarState();
  const isMobileOpen = state.isMobileOpen;
  const collapsed = state.collapsed && !isMobileOpen;
  const setCollapsed = state.setCollapsed;
  const location = useLocation();
  const { hasAnyPermission, isSuperAdmin, loading: isLoadingPermissions } = usePermissions();
  const { logout, profile, tenant, currentAssignment } = useAuth();
  const { displayUrl: logoSrc } = useGoogleDriveImage(tenant?.logo_url);

  const navRef = useRef<HTMLElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);

  const checkScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const { scrollTop, scrollHeight, clientHeight } = nav;
    setShowScrollDown(scrollTop + clientHeight < scrollHeight - 5);
    setShowScrollUp(scrollTop > 5);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    checkScroll();
    nav.addEventListener("scroll", checkScroll, { passive: true });
    return () => nav.removeEventListener("scroll", checkScroll);
  }, [checkScroll, isLoadingPermissions]);

  const scrollNav = (direction: "up" | "down") => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ top: direction === "down" ? 150 : -150, behavior: "smooth" });
  };

  const canSeeNavItem = (item: NavItem): boolean => {
    if (isSuperAdmin) return true;
    if (item.adminOnly) return true;
    if (!item.moduleCode) return true;
    return hasAnyPermission(item.moduleCode);
  };

  const visibleCategories = navCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(canSeeNavItem),
    }))
    .filter((cat) => cat.items.length > 0);

  const visibleBottomNav = bottomNav.filter(canSeeNavItem);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => state.setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar transition-transform duration-300 ease-in-out md:transition-all",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          "md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <Link to="/dashboard" className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 hover:bg-sidebar-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <img src={logoSrc || nexurhIcon} alt={tenant?.name || "NexuHR"} className="h-10 w-10 rounded-lg object-contain" />
              {!collapsed && (
                <div className="animate-fade-in">
                  <h1 className="text-lg font-bold text-sidebar-foreground">{tenant?.name || currentAssignment?.tenant_name || "NexuHR"}</h1>
                  <p className="text-xs text-sidebar-foreground/60">NexuHR.pro</p>
                </div>
              )}
            </div>
          </Link>

          {/* Navigation */}
          <div className="relative flex-1 min-h-0">
            {showScrollUp && (
              <button
                onClick={() => scrollNav("up")}
                className="absolute top-0 left-0 right-0 z-10 flex h-8 items-center justify-center bg-gradient-to-b from-sidebar to-transparent transition-opacity hover:opacity-100"
                style={{ opacity: showScrollUp ? 0.8 : 0 }}
              >
                <ChevronUp className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
            )}
            <nav
              ref={navRef}
              className="flex h-full flex-col space-y-5 px-3 py-4 overflow-y-auto scrollbar-none"
            >
              {isLoadingPermissions ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-10 rounded-lg bg-sidebar-accent/30 animate-pulse",
                      collapsed ? "w-12" : "w-full"
                    )}
                  />
                ))}
              </div>
            ) : (
              visibleCategories.map((category) => (
                <div key={category.label}>
                  {!collapsed && (
                    <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                      {category.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-pulse-soft")} />
                          {!collapsed && <span className="animate-fade-in">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>
            {showScrollDown && (
              <button
                onClick={() => scrollNav("down")}
                className="absolute bottom-0 left-0 right-0 z-10 flex h-8 items-center justify-center bg-gradient-to-t from-sidebar to-transparent transition-opacity hover:opacity-100"
                style={{ opacity: showScrollDown ? 0.8 : 0 }}
              >
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
            )}
          </div>

          {/* Bottom section */}
          <div className="border-t border-sidebar-border px-3 py-4">
            {/* Storage indicator */}
            <StorageIndicator collapsed={collapsed} />

            {visibleBottomNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}

            <button
              onClick={logout}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Cerrar Sesión"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>

          {/* Collapse button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center p-0 rounded-full border border-border bg-card shadow-md hover:bg-secondary"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
