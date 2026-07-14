import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EmployeePortalAuthProvider } from "@/hooks/useEmployeePortalAuth";
import { supabase } from "@/lib/supabaseClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EmployeePortalProtectedRoute } from "@/components/portal/EmployeePortalProtectedRoute";
import { DynamicTenantBranding } from "@/components/portal/DynamicTenantBranding";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Empleados from "./pages/Empleados";
import EmpleadoDetalle from "./pages/EmpleadoDetalle";
import Vigilancias from "./pages/Vigilancias";
import Examenes from "./pages/Examenes";
import Cursos from "./pages/Cursos";
import Dotacion from "./pages/Dotacion";
import Comites from "./pages/Comites";
import Eventos from "./pages/Eventos";
import Firmas from "./pages/Firmas";
import Evaluaciones from "./pages/Evaluaciones";
import Comunicaciones from "./pages/Comunicaciones";
import DistributionListEdit from "./pages/DistributionListEdit";
import Nomina from "./pages/Nomina";
import Reglamento from "./pages/Reglamento";
import Configuracion from "./pages/Configuracion";
import Perfil from "./pages/Perfil";
import Notificaciones from "./pages/Notificaciones";
import Incapacidades from "./pages/Incapacidades";
import ActivosFijos from "./pages/ActivosFijos";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import RegisterTenant from "./pages/RegisterTenant";
import Suscripcion from "./pages/Suscripcion";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import NotFound from "./pages/NotFound";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalChangePassword from "./pages/portal/PortalChangePassword";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPendientesFirmar from "./pages/portal/PortalPendientesFirmar";
import PortalPendientesHacer from "./pages/portal/PortalPendientesHacer";
import PortalDesprendibles from "./pages/portal/PortalDesprendibles";
import PortalReglamento from "./pages/portal/PortalReglamento";
import PortalCertificados from "./pages/portal/PortalCertificados";
import PortalPerfil from "./pages/portal/PortalPerfil";
import PortalCursos from "./pages/portal/PortalCursos";
import PortalEvaluaciones from "./pages/portal/PortalEvaluaciones";
import PortalEventos from "./pages/portal/PortalEventos";
import PortalExamenes from "./pages/portal/PortalExamenes";
import PortalDotacion from "./pages/portal/PortalDotacion";
import PortalVigilancias from "./pages/portal/PortalVigilancias";
import PortalIncapacidades from "./pages/portal/PortalIncapacidades";
import PortalHistorial from "./pages/portal/PortalHistorial";
import PoliticasPrivacidad from "./pages/PoliticasPrivacidad";
import TerminosServicio from "./pages/TerminosServicio";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider supabaseClient={supabase}>
        <DynamicTenantBranding />
        <EmployeePortalAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/register-tenant" element={<RegisterTenant />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/politicas-privacidad" element={<PoliticasPrivacidad />} />
              <Route path="/terminos-servicio" element={<TerminosServicio />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/empleados" element={<ProtectedRoute><Empleados /></ProtectedRoute>} />
              <Route path="/empleados/:id" element={<ProtectedRoute><EmpleadoDetalle /></ProtectedRoute>} />
              <Route path="/vigilancias" element={<ProtectedRoute><Vigilancias /></ProtectedRoute>} />
              <Route path="/examenes" element={<ProtectedRoute><Examenes /></ProtectedRoute>} />
              <Route path="/cursos" element={<ProtectedRoute><Cursos /></ProtectedRoute>} />
              <Route path="/dotacion" element={<ProtectedRoute><Dotacion /></ProtectedRoute>} />
              <Route path="/comites" element={<ProtectedRoute><Comites /></ProtectedRoute>} />
              <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
              <Route path="/firmas" element={<ProtectedRoute><Firmas /></ProtectedRoute>} />
              <Route path="/evaluaciones" element={<ProtectedRoute><Evaluaciones /></ProtectedRoute>} />
              <Route path="/comunicaciones" element={<ProtectedRoute><Comunicaciones /></ProtectedRoute>} />
              <Route path="/comunicaciones/listas/:id" element={<ProtectedRoute><DistributionListEdit /></ProtectedRoute>} />
              <Route path="/nomina" element={<ProtectedRoute><Nomina /></ProtectedRoute>} />
              <Route path="/reglamento" element={<ProtectedRoute><Reglamento /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/notificaciones" element={<ProtectedRoute><Notificaciones /></ProtectedRoute>} />
              <Route path="/incapacidades" element={<ProtectedRoute><Incapacidades /></ProtectedRoute>} />
              <Route path="/activos-fijos" element={<ProtectedRoute><ActivosFijos /></ProtectedRoute>} />
              <Route path="/suscripcion" element={<ProtectedRoute><Suscripcion /></ProtectedRoute>} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-failure" element={<PaymentFailure />} />

              {/* Employee Portal — dynamic slug (matches /:slug, /:slug/inicio, etc.) */}
              <Route path="/:portalSlug" element={<PortalLogin />} />
              <Route path="/:portalSlug/cambiar-clave" element={<EmployeePortalProtectedRoute><PortalChangePassword /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/inicio" element={<EmployeePortalProtectedRoute><PortalDashboard /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/pendientes/firmar" element={<EmployeePortalProtectedRoute><PortalPendientesFirmar /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/pendientes/hacer" element={<EmployeePortalProtectedRoute><PortalPendientesHacer /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/mi-actividad" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/mi-actividad/cursos" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/desprendibles" element={<EmployeePortalProtectedRoute><PortalDesprendibles /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/reglamento" element={<EmployeePortalProtectedRoute><PortalReglamento /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/certificados" element={<EmployeePortalProtectedRoute><PortalCertificados /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/perfil" element={<EmployeePortalProtectedRoute><PortalPerfil /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/cursos" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/evaluaciones" element={<EmployeePortalProtectedRoute><PortalEvaluaciones /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/eventos" element={<EmployeePortalProtectedRoute><PortalEventos /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/examenes" element={<EmployeePortalProtectedRoute><PortalExamenes /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/dotacion" element={<EmployeePortalProtectedRoute><PortalDotacion /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/vigilancias" element={<EmployeePortalProtectedRoute><PortalVigilancias /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/incapacidades" element={<EmployeePortalProtectedRoute><PortalIncapacidades /></EmployeePortalProtectedRoute>} />
              <Route path="/:portalSlug/historial" element={<EmployeePortalProtectedRoute><PortalHistorial /></EmployeePortalProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </EmployeePortalAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
