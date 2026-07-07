import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DistributionList, DistributionListType } from "@/hooks/useDistributionLists";

interface DistributionListFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: DistributionList | null;
  onSave: (list: Partial<DistributionList>) => void;
  isSaving?: boolean;
}

export function DistributionListFormModal({
  open,
  onOpenChange,
  list,
  onSave,
  isSaving
}: DistributionListFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [listType, setListType] = useState<DistributionListType>("personalizada");
  const [targetValue, setTargetValue] = useState("");

  useEffect(() => {
    if (open) {
      if (list) {
        setName(list.name || "");
        setDescription(list.description || "");
        setListType(list.list_type || "personalizada");
        setTargetValue(list.target_value || "");
      } else {
        setName("");
        setDescription("");
        setListType("personalizada");
        setTargetValue("");
      }
    }
  }, [open, list]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      list_type: listType,
      target_value: listType !== "general" && listType !== "personalizada" ? targetValue : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{list ? "Editar Lista" : "Nueva Lista"}</DialogTitle>
            <DialogDescription>
              Configura los datos básicos de la lista de distribución.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la lista</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Operadores de Planta"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de lista</Label>
              <Select value={listType} onValueChange={(v) => setListType(v as DistributionListType)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (Todos)</SelectItem>
                  <SelectItem value="cargo">Por Cargo</SelectItem>
                  <SelectItem value="departamento">Por Departamento</SelectItem>
                  <SelectItem value="personalizada">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(listType === "cargo" || listType === "departamento") && (
              <div className="grid gap-2">
                <Label htmlFor="target">
                  {listType === "cargo" ? "Cargo" : "Departamento"}
                </Label>
                <Input
                  id="target"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                  placeholder={`Ej: ${listType === "cargo" ? "Operario" : "Producción"}`}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles sobre esta lista..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
