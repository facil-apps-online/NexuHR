import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";

interface TenantSettings {
  nit?: string;
  address?: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  website?: string;
}

interface Tenant {
  id: string;
  name: string;
  logo_url: string | null;
  tax_id: string | null;
  physical_address_line1: string | null;
  contact_phone: string | null;
  physical_city: string | null;
  physical_state: string | null;
  website: string | null;
  notes: string | null;
}

export function CompanySettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nit: "",
    address: "",
    phone: "",
    city: "",
    country: "",
    industry: "",
    website: "",
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, logo_url, tax_id, physical_address_line1, contact_phone, physical_city, physical_state, website, notes")
        .eq("id", profile.tenant_id)
        .single();
      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!profile?.tenant_id,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        nit: tenant.tax_id || "",
        address: tenant.physical_address_line1 || "",
        phone: tenant.contact_phone || "",
        city: tenant.physical_city || "",
        country: tenant.physical_state || "",
        industry: tenant.notes || "",
        website: tenant.website || "",
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.tenant_id) throw new Error("No tenant found");
      const { error } = await supabase
        .from("tenants")
        .update({ 
          name: data.name, 
          tax_id: data.nit,
          physical_address_line1: data.address,
          contact_phone: data.phone,
          physical_city: data.city,
          physical_state: data.country,
          notes: data.industry,
          website: data.website,
          updated_at: new Date().toISOString() 
        })
        .eq("id", profile.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Información de la empresa actualizada");
    },
    onError: (error) => {
      console.error("Error updating company:", error);
      toast.error("Error al guardar los cambios");
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.tenant_id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no debe superar 2 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.tenant_id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", profile.tenant_id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Logo actualizado");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al subir el logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!profile?.tenant_id) return;
    try {
      await supabase.from("tenants").update({ logo_url: null, updated_at: new Date().toISOString() }).eq("id", profile.tenant_id);
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Logo eliminado");
    } catch {
      toast.error("Error al eliminar el logo");
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.tenant_id) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No tienes una empresa asociada a tu cuenta.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Card */}
      <Card>
        <CardHeader>
          <CardTitle>Logo de la Empresa</CardTitle>
          <CardDescription>Este logo se usará en certificaciones, desprendibles y documentos oficiales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {tenant?.logo_url ? (
              <div className="relative group">
                <img
                  src={tenant.logo_url}
                  alt="Logo de la empresa"
                  className="h-24 w-24 object-contain rounded-lg border bg-background p-2"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                <Upload className="h-8 w-8" />
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {tenant?.logo_url ? "Cambiar logo" : "Subir logo"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máximo 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>Datos generales de tu organización</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de la empresa</Label>
                <Input id="company-name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nombre de la empresa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nit">NIT / Identificación fiscal</Label>
                <Input id="nit" value={formData.nit} onChange={(e) => handleChange("nit", e.target.value)} placeholder="900.123.456-7" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Calle 100 #15-20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Bogotá" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={formData.country} onChange={(e) => handleChange("country", e.target.value)} placeholder="Colombia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+57 1 234 5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industria / Sector</Label>
                <Input id="industry" value={formData.industry} onChange={(e) => handleChange("industry", e.target.value)} placeholder="Tecnología, Manufactura, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <Input id="website" value={formData.website} onChange={(e) => handleChange("website", e.target.value)} placeholder="https://www.empresa.com" />
              </div>
            </div>
            <Button type="submit" className="gradient-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
