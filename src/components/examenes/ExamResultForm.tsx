import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coreSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText, X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Tables } from "@/integrations/supabase/types";

const resultFormSchema = z.object({
  result: z.string().min(1, "Seleccione el resultado"),
  exam_date: z.string().min(1, "Ingrese la fecha del examen"),
  expiry_date: z.string().optional(),
  observations: z.string().optional(),
  create_vigilancia: z.boolean().optional(),
  vigilancia_type_id: z.string().optional(),
  vigilancia_follow_up_date: z.string().optional(),
});

type ResultFormValues = z.infer<typeof resultFormSchema>;

interface ExamResultFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Tables<"exams">;
}

const RESULT_OPTIONS = [
  { value: "Apto", label: "Apto", requiresVigilancia: false },
  { value: "Apto con restricciones", label: "Apto con restricciones", requiresVigilancia: true },
  { value: "Apto con recomendaciones", label: "Apto con recomendaciones", requiresVigilancia: false },
  { value: "No apto temporal", label: "No apto temporal", requiresVigilancia: true },
  { value: "No apto definitivo", label: "No apto definitivo", requiresVigilancia: true },
  { value: "Aplazado", label: "Aplazado", requiresVigilancia: false },
];

export function ExamResultForm({
  open,
  onOpenChange,
  exam,
}: ExamResultFormProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch vigilancia types from master data
  const { data: vigilanciaTypes } = useQuery({
    queryKey: ["vigilancia_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vigilancia_types")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      result: exam.result || "",
      exam_date: exam.exam_date || "",
      expiry_date: exam.expiry_date || "",
      observations: exam.observations || "",
      create_vigilancia: false,
      vigilancia_type_id: "",
      vigilancia_follow_up_date: "",
    },
  });

  const selectedResult = form.watch("result");
  const createVigilancia = form.watch("create_vigilancia");
  const resultOption = RESULT_OPTIONS.find((o) => o.value === selectedResult);
  const showVigilanciaOption = resultOption?.requiresVigilancia;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const mutation = useMutation({
    mutationFn: async (values: ResultFormValues) => {
      let documentUrl = exam.document_url;

      // Upload file if provided
      if (file) {
        setUploading(true);

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
            tenantId: profile?.tenant_id,
            fileName: `${exam.id}-${Date.now()}.${file.name.split('.').pop()}`,
            fileBase64: base64data,
            mimeType: file.type || 'application/octet-stream',
            path_components: ['Soportes', 'Evidencias', 'examenes', exam.id]
          }
        });

        if (uploadError || !uploadData?.success) {
          setUploading(false);
          throw new Error(uploadError?.message || uploadData?.error || 'Error al subir el documento');
        }

        documentUrl = `https://drive.google.com/uc?id=${uploadData.fileId}`;
        setUploading(false);
      }

      const { error } = await supabase
        .from("exams")
        .update({
          result: values.result,
          exam_date: values.exam_date,
          expiry_date: values.expiry_date || null,
          observations: values.observations || null,
          document_url: documentUrl,
          status: "vigente",
        })
        .eq("id", exam.id);

      if (error) throw error;

      // Auto-create vigilancia if requested
      if (values.create_vigilancia && values.vigilancia_type_id) {
        const selectedType = vigilanciaTypes?.find(t => t.id === values.vigilancia_type_id);
        if (selectedType) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error("Usuario no autenticado");

          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("user_id", userData.user.id)
            .single();

          if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

          const { error: vigError } = await supabase.from("vigilancias").insert({
            employee_id: exam.employee_id,
            tenant_id: profile.tenant_id,
            vigilancia_type: selectedType.name,
            diagnosis: `Seguimiento por resultado: ${values.result}`,
            start_date: values.exam_date,
            follow_up_date: values.vigilancia_follow_up_date || null,
            restrictions: null,
            recommendations: values.observations || null,
            status: "activa",
            created_by: userData.user.id,
          });

          if (vigError) throw new Error("Resultado guardado pero error al crear vigilancia: " + vigError.message);
        }
      }

      return values;
    },
    onSuccess: (values) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-exam-stats"] });
      queryClient.invalidateQueries({ queryKey: ["employee-exams"] });
      queryClient.invalidateQueries({ queryKey: ["vigilancias"] });
      queryClient.invalidateQueries({ queryKey: ["employee-vigilancias"] });

      if (values.create_vigilancia && values.vigilancia_type_id) {
        toast.success("Resultado registrado y vigilancia creada correctamente");
      } else {
        toast.success("Resultado registrado correctamente");
      }

      setFile(null);
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar el resultado: " + error.message);
    },
  });

  const onSubmit = (values: ResultFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Resultado del Examen</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="exam_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Examen</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado / Concepto</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el resultado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESULT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showVigilanciaOption && (
              <Alert className="border-warning/20 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  Este resultado puede requerir seguimiento en una vigilancia
                  epidemiológica.
                  <div className="mt-2 space-y-3">
                    <FormField
                      control={form.control}
                      name="create_vigilancia"
                      render={({ field }) => (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-border"
                          />
                          <span>Crear vigilancia epidemiológica</span>
                        </label>
                      )}
                    />
                    {createVigilancia && (
                      <>
                        <FormField
                          control={form.control}
                          name="vigilancia_type_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Vigilancia</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione el tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {vigilanciaTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vigilancia_follow_up_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Próximo Seguimiento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Documento / Certificado</FormLabel>
              <div
                {...getRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">
                      Arrastra o haz clic para subir
                    </span>
                    <span className="text-xs">PDF, JPG, PNG (máx 10MB)</span>
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales, restricciones, recomendaciones..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || uploading}
                className="gradient-primary"
              >
                {(mutation.isPending || uploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Resultado
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
