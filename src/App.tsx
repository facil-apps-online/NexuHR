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
import Nomina from "./pages/Nomina";
import Reglamento from "./pages/Reglamento";
import Configuracion from "./pages/Configuracion";
import Notificaciones from "./pages/Notificaciones";
import Incapacidades from "./pages/Incapacidades";
import Auth from "./pages/Auth";
import RegisterTenant from "./pages/RegisterTenant";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider supabaseClient={supabase}>
        <EmployeePortalAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/register-tenant" element={<RegisterTenant />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
              <Route path="/nomina" element={<ProtectedRoute><Nomina /></ProtectedRoute>} />
              <Route path="/reglamento" element={<ProtectedRoute><Reglamento /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
              <Route path="/notificaciones" element={<ProtectedRoute><Notificaciones /></ProtectedRoute>} />
              <Route path="/incapacidades" element={<ProtectedRoute><Incapacidades /></ProtectedRoute>} />

              {/* Employee Portal — case-insensitive aliases */}
              <Route path="/Funcionarios" element={<PortalLogin />} />
              <Route path="/funcionarios" element={<PortalLogin />} />
              <Route path="/Funcionarios/cambiar-clave" element={<EmployeePortalProtectedRoute><PortalChangePassword /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/inicio" element={<EmployeePortalProtectedRoute><PortalDashboard /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/pendientes/firmar" element={<EmployeePortalProtectedRoute><PortalPendientesFirmar /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/pendientes/hacer" element={<EmployeePortalProtectedRoute><PortalPendientesHacer /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/mi-actividad" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/mi-actividad/cursos" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/desprendibles" element={<EmployeePortalProtectedRoute><PortalDesprendibles /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/reglamento" element={<EmployeePortalProtectedRoute><PortalReglamento /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/certificados" element={<EmployeePortalProtectedRoute><PortalCertificados /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/perfil" element={<EmployeePortalProtectedRoute><PortalPerfil /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/cursos" element={<EmployeePortalProtectedRoute><PortalCursos /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/evaluaciones" element={<EmployeePortalProtectedRoute><PortalEvaluaciones /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/eventos" element={<EmployeePortalProtectedRoute><PortalEventos /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/examenes" element={<EmployeePortalProtectedRoute><PortalExamenes /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/dotacion" element={<EmployeePortalProtectedRoute><PortalDotacion /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/vigilancias" element={<EmployeePortalProtectedRoute><PortalVigilancias /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/incapacidades" element={<EmployeePortalProtectedRoute><PortalIncapacidades /></EmployeePortalProtectedRoute>} />
              <Route path="/Funcionarios/historial" element={<EmployeePortalProtectedRoute><PortalHistorial /></EmployeePortalProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </EmployeePortalAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
