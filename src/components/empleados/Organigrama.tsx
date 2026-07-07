import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useGoogleDriveImage } from "@/hooks/useGoogleDriveImage";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department: string | null;
  photo_url: string | null;
  supervisor_id: string | null;
  active: boolean;
  tenant_id: string;
}

interface TreeNode extends Employee {
  children: TreeNode[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const employeeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes with empty children
  employees.forEach((emp) => {
    employeeMap.set(emp.id, { ...emp, children: [] });
  });

  // Build tree structure
  employees.forEach((emp) => {
    const node = employeeMap.get(emp.id)!;
    if (emp.supervisor_id && employeeMap.has(emp.supervisor_id)) {
      employeeMap.get(emp.supervisor_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by name
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => 
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
    node.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);
  roots.sort((a, b) => 
    `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
  );

  return roots;
}

interface OrgNodeProps {
  node: TreeNode;
  level: number;
}

function OrgNode({ node, level }: OrgNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const { displayUrl: photoUrl } = useGoogleDriveImage(node.photo_url || undefined, node.tenant_id);

  return (
    <div className="relative">
      <div 
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group",
          !node.active && "opacity-60"
        )}
        onClick={() => navigate(`/empleados/${node.id}`)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={photoUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {node.first_name[0]}{node.last_name[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate group-hover:text-primary transition-colors">
            {node.first_name} {node.last_name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {node.position || "Sin cargo"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {node.department && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {node.department}
            </Badge>
          )}
          {hasChildren && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {node.children.length}
            </Badge>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 mt-2 space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-4 before:w-px before:bg-border">
          {node.children.map((child) => (
            <div key={child.id} className="relative before:absolute before:-left-6 before:top-5 before:w-6 before:h-px before:bg-border">
              <OrgNode node={child} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganigramaProps {
  className?: string;
}

export function Organigrama({ className }: OrganigramaProps) {
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees_organigrama"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, position, department, photo_url, supervisor_id, active, tenant_id")
        .order("first_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          Error al cargar el organigrama
        </CardContent>
      </Card>
    );
  }

  const tree = buildTree(employees || []);
  const totalEmployees = employees?.length || 0;
  const activeEmployees = employees?.filter(e => e.active).length || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organigrama
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {activeEmployees} empleados activos de {totalEmployees} total
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay empleados registrados
          </p>
        ) : (
          <div className="space-y-2">
            {tree.map((node) => (
              <OrgNode key={node.id} node={node} level={0} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
