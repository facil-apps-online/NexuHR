import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, User, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvatarUploader } from "@/components/AvatarUploader";

const profileFormSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido."),
  last_name: z.string().min(1, "El apellido es requerido."),
});

const passwordFormSchema = z.object({
  newPassword: z.string().min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const PasswordRequirement = ({ isValid, text }: { isValid: boolean; text: string }) => (
  <div className={`flex items-center text-sm ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
    {isValid ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
    {text}
  </div>
);

function PersonalInfoTab() {
  const { user, profile, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { first_name: '', last_name: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.firstName || '',
        last_name: profile.lastName || '',
      });
    }
  }, [profile, form]);

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-actions', {
        body: {
          action: 'update-user-settings',
          payload: {
            userId: user.id,
            metadata: {
              first_name: values.first_name,
              last_name: values.last_name,
            }
          }
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message || 'Error al actualizar perfil');

      toast({ title: 'Éxito', description: 'Perfil actualizado correctamente.' });
      await refreshUser();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo actualizar el perfil', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
        <CardDescription>Actualiza tu avatar, nombre y apellido.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-center">
          <AvatarUploader size="lg" initialAvatarUrl={profile?.avatarUrl} />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const newPassword = passwordForm.watch('newPassword');

  const passwordChecks = {
    length: (newPassword || '').length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    specialChar: /[!@#$%^&*]/.test(newPassword),
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('user-actions', {
        body: {
          action: 'update-password',
          payload: {
            userId: user.id,
            newPassword: values.newPassword
          }
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message || 'Error al actualizar contraseña');

      toast({ title: 'Éxito', description: 'Contraseña actualizada correctamente.' });
      passwordForm.reset();
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo actualizar la contraseña', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>Cambia tu contraseña de acceso.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6 max-w-md">
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Ingresa tu nueva contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirma tu nueva contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted p-4 rounded-md space-y-2">
              <p className="text-sm font-medium mb-2">Requisitos de la contraseña:</p>
              <PasswordRequirement isValid={passwordChecks.length} text="Al menos 8 caracteres" />
              <PasswordRequirement isValid={passwordChecks.uppercase} text="Al menos una letra mayúscula" />
              <PasswordRequirement isValid={passwordChecks.lowercase} text="Al menos una letra minúscula" />
              <PasswordRequirement isValid={passwordChecks.number} text="Al menos un número" />
              <PasswordRequirement isValid={passwordChecks.specialChar} text="Al menos un carácter especial (!@#$%^&*)" />
            </div>

            <Button type="submit" disabled={isSaving || !passwordForm.formState.isValid}>
              {isSaving ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Perfil() {
  return (
    <MainLayout>
      <div className="animate-fade-in max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="mt-1 text-muted-foreground">
            Administra tu información personal y seguridad
          </p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Información</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Seguridad</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6">
            <PersonalInfoTab />
          </TabsContent>

          <TabsContent value="seguridad" className="mt-6">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
