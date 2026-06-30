# Fase 3 del portal + Módulo de Incapacidades

## Resumen
Implementar todas las mejoras propuestas (notificaciones al empleado, PWA, carga de evidencias, historial) y crear desde cero el módulo de **Incapacidades** — tanto en el sistema admin como en el portal del empleado, ya que es justamente lo que necesita el empleado poder cargar.

---

## 1. Nuevo módulo: Incapacidades (admin + portal)

### Backend
- Tabla `incapacidades`:
  - `id`, `tenant_id`, `employee_id`, `tipo` (enum: enfermedad_general, accidente_trabajo, enfermedad_laboral, licencia_maternidad, licencia_paternidad, licencia_luto, otro)
  - `fecha_inicio`, `fecha_fin`, `dias`, `diagnostico` (texto), `codigo_cie` (opcional)
  - `entidad` (EPS/ARL/otro), `numero_radicado`, `prorroga_de` (FK self)
  - `estado` (enum: registrada, en_revision, aprobada, rechazada, transcrita_nomina)
  - `origen` (admin | portal_empleado)
  - `documento_url` (PDF de la incapacidad), `notas_internas`
  - `created_by`, `reviewed_by`, `reviewed_at`, timestamps
- Bucket `incapacidades` (privado) con políticas RLS análogas a `exam-documents`.
- RLS:
  - Admin: ver/editar todas de su tenant según permiso `incapacidades.*`.
  - Empleado vía portal: `SELECT` solo las propias; `INSERT` solo las propias con `origen='portal_empleado'` y `estado='registrada'`; sin `UPDATE`/`DELETE`.
- Tipo de maestro `incapacidad_types` (estándar + personalizables por tenant), siguiendo el patrón ya establecido.

### UI admin
- Página `/incapacidades` con tabla, filtros (empleado, tipo, estado, fechas), KPIs (días totales del mes, top causas).
- Form crear/editar con cálculo automático de días, carga de PDF, vinculación a vigilancia epidemiológica si aplica.
- En **Ficha Técnica** del empleado: tab "Incapacidades" con historial.
- Botón "Marcar transcrita en nómina" para conciliación.

### UI portal
- `/Funcionarios/incapacidades`: lista + botón "Reportar nueva incapacidad" con form (tipo, fechas, entidad, subir PDF). Estado visible al empleado.

---

## 2. Carga de evidencias desde el portal (transversal)

- Nuevo componente `PortalEvidenceUpload` reutilizable.
- Permitir adjuntar evidencias en:
  - Cursos (certificados externos)
  - Exámenes (resultados que trae el empleado)
  - Dotación (foto de elemento recibido)
  - Incapacidades (PDF de la EPS)
- RLS: `INSERT` en `evidences` cuando `uploaded_by_employee_id = get_current_employee_id()` y el registro padre pertenece al empleado.
- Admin ve indicador "Cargado por empleado" para revisar.

---

## 3. Notificaciones al empleado

- Extender tabla `notifications` o crear `employee_notifications` (decidir según el modelo actual; preferencia: reutilizar `notifications` agregando `employee_id` nullable).
- Generador (edge function `generate-employee-notifications`, scheduled diario):
  - Documentos pendientes por firmar
  - Cursos próximos a vencer o vencidos
  - Evaluaciones asignadas
  - Exámenes médicos programados
  - Incapacidad cambia de estado
- Email opcional por empleado (preferencia configurable en `PortalPerfil`).
- Campana de notificaciones en `EmployeePortalLayout` (igual al admin pero scope empleado).

---

## 4. PWA / instalable

- `vite-plugin-pwa` con manifest (nombre "NexuRH Empleados", icono `nexurh-icon`, theme color), service worker básico (network-first para datos, cache-first para assets).
- Banner "Instalar app" en login del portal y en dashboard si no está instalada.
- Offline fallback simple: mostrar pantalla "Sin conexión" cuando falla la red.

---

## 5. Historial de actividad del empleado

- Tabla `employee_activity_log`: `id, tenant_id, employee_id, action, entity_type, entity_id, metadata jsonb, created_at`.
- Triggers o escritura desde el frontend del portal en: login, firma, descarga de certificado/desprendible, cambio de contraseña, carga de evidencia, reporte de incapacidad.
- Vista en `/Funcionarios/historial` con timeline. Admin lo ve también desde Ficha Técnica.

---

## Detalles técnicos

- Reutilizar `portalSupabase` para todas las consultas del portal.
- Permisos dinámicos: nuevo módulo `incapacidades` con acciones estándar (view/create/edit/delete/manage).
- Mantener tipografía 16–18px y mobile-first en todas las nuevas vistas del portal.
- Sin cambios destructivos a tablas existentes.

---

## Orden de implementación sugerido

1. Migración: tabla `incapacidades` + maestros + bucket + RLS + activity_log + notifications.employee_id.
2. Módulo admin Incapacidades (página + form + tab ficha técnica).
3. Portal: vista Incapacidades con reporte por empleado.
4. Carga de evidencias desde portal en módulos existentes.
5. Notificaciones al empleado + campana en layout.
6. PWA (manifest + SW).
7. Historial de actividad + timeline.

¿Procedo con todo en este orden, o prefieres que arranque solo por el módulo de Incapacidades y dejemos PWA/notificaciones/historial para una iteración posterior?
