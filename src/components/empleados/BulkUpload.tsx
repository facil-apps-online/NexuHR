import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ParsedEmployee {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  hire_date?: string;
  position?: string;
  department?: string;
  address?: string;
  city?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  isValid: boolean;
  errors: string[];
}

interface BulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REQUIRED_COLUMNS = ["document_type", "document_number", "first_name", "last_name"];
const OPTIONAL_COLUMNS = [
  "email", "phone", "birth_date", "hire_date", 
  "position", "department", "address", "city",
  "emergency_contact", "emergency_phone"
];

const COLUMN_LABELS: Record<string, string> = {
  document_type: "Tipo Doc.",
  document_number: "Nro. Doc.",
  first_name: "Nombres",
  last_name: "Apellidos",
  email: "Email",
  phone: "Teléfono",
  birth_date: "Fecha Nac.",
  hire_date: "Fecha Ingreso",
  position: "Cargo",
  department: "Área",
  address: "Dirección",
  city: "Ciudad",
  emergency_contact: "Contacto Emergencia",
  emergency_phone: "Tel. Emergencia",
};

export function BulkUpload({ open, onOpenChange, onSuccess }: BulkUploadProps) {
  const { profile } = useAuth();
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const normalizeColumnName = (name: string): string => {
    const normalized = name.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_");
    
    // Map common variations
    const mappings: Record<string, string> = {
      "tipo_documento": "document_type",
      "tipo_doc": "document_type",
      "tipodoc": "document_type",
      "numero_documento": "document_number",
      "nro_documento": "document_number",
      "nrodoc": "document_number",
      "cedula": "document_number",
      "nombres": "first_name",
      "nombre": "first_name",
      "apellidos": "last_name",
      "apellido": "last_name",
      "correo": "email",
      "correo_electronico": "email",
      "telefono": "phone",
      "celular": "phone",
      "fecha_nacimiento": "birth_date",
      "fecha_nac": "birth_date",
      "nacimiento": "birth_date",
      "fecha_ingreso": "hire_date",
      "fecha_contratacion": "hire_date",
      "ingreso": "hire_date",
      "cargo": "position",
      "puesto": "position",
      "area": "department",
      "departamento": "department",
      "direccion": "address",
      "ciudad": "city",
      "contacto_emergencia": "emergency_contact",
      "telefono_emergencia": "emergency_phone",
      "tel_emergencia": "emergency_phone",
    };
    
    return mappings[normalized] || normalized;
  };

  const parseDate = (value: any): string | undefined => {
    if (!value) return undefined;
    
    // Handle Excel date serial numbers
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    
    // Handle string dates
    if (typeof value === "string") {
      const trimmed = value.trim();
      // Try ISO format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // Try DD/MM/YYYY
      const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
      }
    }
    
    return undefined;
  };

  const validateEmployee = (row: Record<string, any>): ParsedEmployee => {
    const errors: string[] = [];
    
    const employee: ParsedEmployee = {
      document_type: String(row.document_type || "CC").trim().toUpperCase(),
      document_number: String(row.document_number || "").trim(),
      first_name: String(row.first_name || "").trim(),
      last_name: String(row.last_name || "").trim(),
      email: row.email ? String(row.email).trim() : undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      birth_date: parseDate(row.birth_date),
      hire_date: parseDate(row.hire_date),
      position: row.position ? String(row.position).trim() : undefined,
      department: row.department ? String(row.department).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      city: row.city ? String(row.city).trim() : undefined,
      emergency_contact: row.emergency_contact ? String(row.emergency_contact).trim() : undefined,
      emergency_phone: row.emergency_phone ? String(row.emergency_phone).trim() : undefined,
      isValid: true,
      errors: [],
    };
    
    // Validate required fields
    if (!employee.document_number) {
      errors.push("Número de documento requerido");
    }
    if (!employee.first_name) {
      errors.push("Nombres requerido");
    }
    if (!employee.last_name) {
      errors.push("Apellidos requerido");
    }
    
    // Validate email format
    if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      errors.push("Email inválido");
    }
    
    employee.errors = errors;
    employee.isValid = errors.length === 0;
    
    return employee;
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast.error("El archivo debe tener al menos una fila de encabezados y una de datos");
          return;
        }
        
        // Get headers and normalize them
        const headers = (jsonData[0] as string[]).map(normalizeColumnName);
        
        // Check for required columns
        const missingRequired = REQUIRED_COLUMNS.filter(
          col => !headers.includes(col)
        );
        
        if (missingRequired.length > 0) {
          toast.error(`Columnas requeridas faltantes: ${missingRequired.map(c => COLUMN_LABELS[c]).join(", ")}`);
          return;
        }
        
        // Parse rows
        const rows = jsonData.slice(1) as any[][];
        const parsed = rows
          .filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ""))
          .map(row => {
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            return validateEmployee(rowData);
          });
        
        setParsedData(parsed);
        
        const validCount = parsed.filter(p => p.isValid).length;
        const invalidCount = parsed.length - validCount;
        
        if (invalidCount > 0) {
          toast.warning(`${validCount} registros válidos, ${invalidCount} con errores`);
        } else {
          toast.success(`${validCount} registros listos para importar`);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Error al procesar el archivo");
      }
    };
    
    reader.readAsBinaryString(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!profile?.tenant_id) {
      toast.error("No se pudo determinar el tenant");
      return;
    }
    
    const validEmployees = parsedData.filter(e => e.isValid);
    if (validEmployees.length === 0) {
      toast.error("No hay registros válidos para importar");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const employeesToInsert = validEmployees.map(e => ({
        tenant_id: profile.tenant_id,
        document_type: e.document_type,
        document_number: e.document_number,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email || null,
        phone: e.phone || null,
        birth_date: e.birth_date || null,
        hire_date: e.hire_date || null,
        position: e.position || null,
        department: e.department || null,
        address: e.address || null,
        city: e.city || null,
        emergency_contact: e.emergency_contact || null,
        emergency_phone: e.emergency_phone || null,
        active: true,
      }));
      
            const { data: result, error } = await supabase.functions.invoke("tenant-actions", {
          body: {
            action: "create_employees_bulk",
            payload: {
              employees_data: employeesToInsert
            }
          }
        });
        
        if (error) throw new Error(error.message);
        if (result?.error) throw new Error(result.error);
        
        toast.success(`${validEmployees.length} empleados importados exitosamente`);
      setParsedData([]);
      setFileName(null);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading employees:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Algunos empleados ya existen (documento duplicado)");
      } else {
        toast.error(`Error al importar: ${error.message}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    // Create template data with headers and example rows
    const templateData = [
      {
        "Tipo Doc.": "CC",
        "Nro. Doc.": "1234567890",
        "Nombres": "Juan Carlos",
        "Apellidos": "Pérez García",
        "Email": "juan.perez@empresa.com",
        "Teléfono": "3001234567",
        "Fecha Nac.": "1990-05-15",
        "Fecha Ingreso": "2023-01-10",
        "Cargo": "Analista",
        "Área": "Sistemas",
        "Dirección": "Calle 123 #45-67",
        "Ciudad": "Bogotá",
        "Contacto Emergencia": "María García",
        "Tel. Emergencia": "3009876543",
      },
      {
        "Tipo Doc.": "CC",
        "Nro. Doc.": "9876543210",
        "Nombres": "Ana María",
        "Apellidos": "López Rodríguez",
        "Email": "ana.lopez@empresa.com",
        "Teléfono": "3112345678",
        "Fecha Nac.": "1985-11-20",
        "Fecha Ingreso": "2022-06-01",
        "Cargo": "Coordinador",
        "Área": "Recursos Humanos",
        "Dirección": "Carrera 50 #30-20",
        "Ciudad": "Medellín",
        "Contacto Emergencia": "Pedro López",
        "Tel. Emergencia": "3118765432",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 10 }, // Tipo Doc.
      { wch: 15 }, // Nro. Doc.
      { wch: 20 }, // Nombres
      { wch: 20 }, // Apellidos
      { wch: 25 }, // Email
      { wch: 12 }, // Teléfono
      { wch: 12 }, // Fecha Nac.
      { wch: 14 }, // Fecha Ingreso
      { wch: 15 }, // Cargo
      { wch: 15 }, // Área
      { wch: 25 }, // Dirección
      { wch: 12 }, // Ciudad
      { wch: 20 }, // Contacto Emergencia
      { wch: 14 }, // Tel. Emergencia
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");
    
    // Generate and download
    XLSX.writeFile(workbook, "plantilla_empleados.xlsx");
    toast.success("Plantilla descargada");
  };

  const validCount = parsedData.filter(p => p.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Carga Masiva de Empleados
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) o CSV con los datos de los empleados
          </DialogDescription>
        </DialogHeader>
        
        {parsedData.length === 0 ? (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Suelta el archivo aquí...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    Arrastra un archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: .xlsx, .xls, .csv
                  </p>
                </>
              )}
            </div>
            
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Columnas esperadas:</h4>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plantilla
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Requeridas:</p>
                  <ul className="space-y-1">
                    {REQUIRED_COLUMNS.map(col => (
                      <li key={col} className="flex items-center gap-1">
                        <span className="text-destructive">*</span>
                        {COLUMN_LABELS[col]}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Opcionales:</p>
                  <ul className="space-y-1">
                    {OPTIONAL_COLUMNS.slice(0, 6).map(col => (
                      <li key={col}>{COLUMN_LABELS[col]}</li>
                    ))}
                    <li className="text-muted-foreground">...y más</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-normal">
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  {fileName}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{validCount} válidos</span>
                  {invalidCount > 0 && (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive ml-2" />
                      <span>{invalidCount} con errores</span>
                    </>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setParsedData([]);
                  setFileName(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cambiar archivo
              </Button>
            </div>
            
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo Doc.</TableHead>
                    <TableHead>Nro. Doc.</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((emp, idx) => (
                    <TableRow 
                      key={idx}
                      className={emp.isValid ? "" : "bg-destructive/5"}
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        {emp.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>{emp.document_type}</TableCell>
                      <TableCell>{emp.document_number}</TableCell>
                      <TableCell>{emp.first_name}</TableCell>
                      <TableCell>{emp.last_name}</TableCell>
                      <TableCell>{emp.position || "-"}</TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                      <TableCell>
                        {emp.errors.length > 0 && (
                          <span className="text-sm text-destructive">
                            {emp.errors.join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {parsedData.length > 0 && (
            <Button 
              onClick={handleUpload} 
              disabled={validCount === 0 || isUploading}
              className="gradient-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {validCount} empleados
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
