import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Loader2, FileText, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportDesignerDialog } from "./ReportDesignerDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultTemplate = `<p style="text-align: center"><strong>CERTIFICACIÓN LABORAL</strong></p>
<p><br></p>
<p>{{dirigida_a}}</p>
<p><br></p>
<p>El suscrito Representante Legal de <strong>{{empresa}}</strong>, certifica que:</p>
<p><br></p>
<p><strong>{{nombre_empleado}}</strong>, identificado(a) con {{tipo_documento}} No. {{numero_documento}}, labora en esta empresa desde el {{fecha_inicio}} con contrato a término {{tipo_contrato}}, desempeñando el cargo de <strong>{{cargo}}</strong> en el departamento de {{departamento}}.</p>
<p><br></p>
<p>Devenga un salario mensual de <strong>{{salario_base}}</strong> ({{salario_letras}}).</p>
<p><br></p>
<p>La presente certificación se expide a solicitud del interesado, a los {{dia}} días del mes de {{mes}} de {{año}}.</p>
<p><br></p>
<p>Atentamente,</p>
<p><br></p>
<p>_____________________________</p>
<p>Representante Legal</p>
<p>{{empresa}}</p>`;

const variables = [
  "dirigida_a", "nombre_empleado", "tipo_documento", "numero_documento",
  "cargo", "departamento", "fecha_inicio", "tipo_contrato",
  "salario_base", "salario_letras", "empresa", "dia", "mes", "año",
];

export function CertificateTemplateForm({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [name, setName] = useState("Certificación Laboral Estándar");
  const [content, setContent] = useState(defaultTemplate);
  const [templateType, setTemplateType] = useState<"html" | "repx">("html");
  const [showDesigner, setShowDesigner] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (templateType === "repx") {
        // For .repx templates, we just save metadata to Supabase
        // The actual .repx is stored in Google Drive via the Reporting API
        const { error } = await supabase.from("certificate_templates").insert({
          tenant_id: profile?.tenant_id!,
          name,
          template_type: "repx",
          content_template: "", // Empty for .repx - actual template is in Drive
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("certificate_templates").insert({
          tenant_id: profile?.tenant_id!,
          name,
          template_type: "laboral",
          content_template: content,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plantilla creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      onOpenChange(false);
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Plantilla de Certificación</DialogTitle>
          <DialogDescription>
            Elige entre un editor HTML tradicional o sube un archivo .repx para documentos profesionales.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="html" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Editor HTML
            </TabsTrigger>
            <TabsTrigger value="repx" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Plantilla .repx
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Variables disponibles</Label>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => (
                  <Badge key={v} variant="secondary" className="text-xs font-mono cursor-default">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de la Plantilla</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contenido de la Certificación</Label>
              <RichTextEditor content={content} onChange={setContent} />
            </div>
          </TabsContent>

          <TabsContent value="repx" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Plantilla</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="border rounded-lg p-6 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Sube un archivo .repx para generar documentos con formato profesional.
              </p>
              <Button onClick={() => setShowDesigner(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Subir Plantilla .repx
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || templateType === "html" && !content || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar Plantilla
          </Button>
        </DialogFooter>
      </DialogContent>

      <ReportDesignerDialog
        open={showDesigner}
        onOpenChange={setShowDesigner}
        templateKey={name.replace(/\s+/g, '-').toLowerCase()}
        onSave={(key) => {
          toast.success(`Plantilla "${key}" guardada`);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
