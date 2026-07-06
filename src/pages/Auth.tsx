import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, Loader2 } from "lucide-react";
import nexurhIcon from "@/assets/nexurh-icon.svg";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      // login() de useAuth se encarga de la redirección a "/" al finalizar exitosamente
    } catch (error: any) {
      if (error.message.includes("Invalid login credentials") || error.message.includes("Credenciales")) {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Email o contraseña incorrectos",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Ocurrió un error inesperado",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary to-teal-900 lg:h-screen lg:grid lg:grid-cols-2 lg:overflow-hidden">
      
      {/* Columna Izquierda - Panel Visual */}
      <div className="hidden lg:absolute lg:left-0 lg:top-0 lg:w-1/2 lg:h-full lg:flex lg:flex-col lg:items-center lg:justify-center p-10 text-white bg-gradient-to-br from-primary to-teal-900">
        <img src={nexurhIcon} alt="NexuHR Logo" className="w-48 h-48 mb-6 drop-shadow-lg" />
        <h1 className="text-4xl font-bold text-center">Bienvenido de nuevo a NexuHR</h1>
        <p className="mt-4 text-lg text-center text-primary-foreground/80 max-w-md">Inicia sesión para acceder a tu portal y continuar gestionando tu equipo de manera eficiente.</p>
      </div>

      {/* Columna Derecha - Formulario */}
      <div className="w-full lg:absolute lg:left-1/2 lg:w-1/2 lg:top-0 lg:h-full lg:overflow-y-auto flex items-center justify-center p-6 sm:p-12 lg:bg-background">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="lg:hidden">
              <img src={nexurhIcon} alt="NexuHR" className="mx-auto w-16 h-16 mb-4" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Iniciar Sesión</CardTitle>
              <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
            </div>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Contraseña</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar a mi cuenta"
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-500 mt-6">
                ¿Aún no tienes una cuenta en NexuHR?{' '}
                <Link to="/register-tenant" className="text-primary hover:underline font-semibold">
                  Regístrate aquí
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
