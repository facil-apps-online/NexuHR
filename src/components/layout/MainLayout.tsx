import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useActiveSubscription";
import { ReadOnlyProvider } from "@/contexts/ReadOnlyContext";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { Loader2 } from "lucide-react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebarState() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarState must be used within MainLayout");
  }
  return context;
}

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentAssignment } = useAuth();
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscriptionStatus(currentAssignment?.tenant_id, currentAssignment?.platform_id);
  const navigate = useNavigate();
  const location = useLocation();

  const status = subscription?.status;
  const isAdmin = currentAssignment?.role_name === "tenant_super_admin" || currentAssignment?.role_name === "tenant_admin";
  const isReadOnly = status === "suspendido" || status === "cancelado";
  const showGraceBanner = status === "gracia" && isAdmin;

  useEffect(() => {
    if (!isSubscriptionLoading && (status === "suspendido" || !subscription) && location.pathname !== "/suscripcion") {
      navigate("/suscripcion");
    }
  }, [status, subscription, isSubscriptionLoading, location.pathname, navigate]);

  if (isSubscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <ReadOnlyProvider isReadOnly={isReadOnly}>
      <SidebarContext.Provider value={{ collapsed, setCollapsed, isMobileOpen, setIsMobileOpen }}>
        <div className="min-h-screen bg-background relative">
          <Sidebar />
          <div className={`transition-all duration-300 ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
            <Header />
            {showGraceBanner && <GracePeriodBanner />}
            {isReadOnly && <ReadOnlyBanner />}
            <main className="p-4 md:p-6 relative">
              {children}
              {isReadOnly && (
                <div
                  className="absolute inset-0 bg-black/5 z-50 cursor-not-allowed"
                  title="Funcionalidad restringida. Renueva tu suscripción."
                />
              )}
            </main>
          </div>
        </div>
      </SidebarContext.Provider>
    </ReadOnlyProvider>
  );
}
