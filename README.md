# NexuHR

Plataforma integral de gestión de recursos humanos con soporte Multi-Tenant, portal para empleados, gestión de incapacidades, dotaciones y evaluaciones.

## Tecnologías Principales

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend / Base de Datos**: Supabase (PostgreSQL, Edge Functions, Auth)

## Instalación y Configuración Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Ejecutar el entorno de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

- `src/`: Código fuente principal de la aplicación React.
  - `components/`: Componentes reutilizables y de interfaz.
  - `pages/`: Vistas y páginas principales.
  - `lib/`: Lógica central (core, tenant actions, etc).
- `supabase/`: Archivos relacionados con el backend.
  - `migrations/`: Archivos SQL de migración de base de datos.
  - `functions/`: Edge Functions de Deno/TypeScript.
