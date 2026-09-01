import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { coreSupabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, Eye, FileImage, FileText, File, Camera } from "lucide-react";
import { PhotoToPdfDialog } from "@/components/pdf/PhotoToPdfDialog";
import { OcrProcessor } from "@/components/pdf/OcrProcessor";
import { UnifiedPdfViewer } from "@/components/pdf/UnifiedPdfViewer";
import { toast } from "sonner";

interface EvidenceUploadProps {
  module: string;
  recordId: string;
  employeeId?: string;
  readOnly?: boolean;
}

export function EvidenceUpload({ module, recordId, employeeId, readOnly = false }: EvidenceUploadProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Check if evidence is required for this module
  const { data: tenant } = useQuery({
    queryKey: ["tenant-settings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, settings")
        .eq("id", profile.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const evidenceModules: string[] = (tenant?.settings as any)?.evidence_modules || [];
  const isRequired = evidenceModules.includes(module);

  const { data: evidences, isLoading } = useQuery({
    queryKey: ["evidences", module, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidences")
        .select("*")
        .eq("module", module)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      if (!profile?.tenant_id) throw new Error("Sin tenant");

      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const platformId = import.meta.env.VITE_PLATFORM_ID;
      const { data: uploadData, error: uploadError } = await coreSupabase.functions.invoke('google-drive-upload', {
        body: {
          platform_id: platformId,
          tenantId: profile.tenant_id,
          fileName: `${Date.now()}_${file.name}`,
          fileBase64: base64data,
          mimeType: file.type || "application/octet-stream",
          path_components: ['Soportes', 'Evidencias', module, recordId]
        }
      });

      if (uploadError || !uploadData?.success) throw new Error(uploadError?.message || uploadData?.error || "Error al subir evidencia");
      const fileId = uploadData.fileId;
      const filePath = `https://drive.google.com/uc?id=${fileId}`;

      const { error: dbError } = await supabase.from("evidences").insert({
        tenant_id: profile.tenant_id,
        module,
        record_id: recordId,
        employee_id: employeeId || null,
        file_url: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: profile.user_id,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences", module, recordId] });
      toast.success("Evidencia cargada exitosamente");
    },
    onError: (err) => toast.error("Error al cargar: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      const fileId = fileUrl.includes("id=") ? fileUrl.split("id=")[1] : null;
      if (fileId) {
        await coreSupabase.functions.invoke('google-drive-delete', {
          body: {
            fileId,
            integration_owner_tenant_id: profile?.tenant_id,
            platform_id: import.meta.env.VITE_PLATFORM_ID,
          }
        });
      }
      const { error } = await supabase.from("evidences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences", module, recordId] });
      toast.success("Evidencia eliminada");
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handlePreview = (fileUrl: string) => {
    setPreviewUrl(fileUrl);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    if (fileType.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (fileType === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Don't render if evidence is not required and there are no evidences
  if (!isRequired && (!evidences || evidences.length === 0)) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileImage className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Evidencias</span>
            {isRequired && (
              <Badge variant="outline" className="text-xs">Obligatorio</Badge>
            )}
            {evidences && evidences.length > 0 && (
              <Badge className="bg-success/10 text-success border-success/20 text-xs">
                {evidences.length} archivo{evidences.length > 1 ? "s" : ""}
              </Badge>
            )}
            {isRequired && (!evidences || evidences.length === 0) && (
              <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                Pendiente
              </Badge>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button size="sm" variant="outline" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3 w-3" />
                  )}
                  Adjuntar
                </Button>
              </div>
              <PhotoToPdfDialog
                onFilesReady={async (files) => {
                  for (const file of files) {
                    await uploadMutation.mutateAsync(file);
                  }
                }}
                trigger={
                  <Button size="sm" variant="outline">
                    <Camera className="mr-1 h-3 w-3" />
                    Foto → PDF
                  </Button>
                }
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : evidences && evidences.length > 0 ? (
          <div className="space-y-1">
            {evidences.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(ev.file_type)}
                  <span className="truncate">{ev.file_name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {formatSize(ev.file_size)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePreview(ev.file_url)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: ev.id, fileUrl: ev.file_url })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center p-4">
              {previewUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                <img
                  src={previewUrl}
                  alt="Evidencia"
                  className="max-w-full max-h-96 rounded-lg border border-border"
                />
              ) : previewUrl.toLowerCase().endsWith('.pdf') ? (
                <UnifiedPdfViewer url={previewUrl} className="w-full h-[70vh]" />
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm"
                  >
                    Abrir archivo en nueva pestaña
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
