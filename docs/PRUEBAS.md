# Requerimientos, trazabilidad y pruebas

Versión 2.0 · Fecha: 18 de octubre de 2026 · Evaluación local.

## Actualización de preparación Supabase

El 26 de octubre de 2026 se agregaron pruebas del adaptador PostgreSQL, validación TLS, transacciones con un único cliente, almacenamiento privado y un recorrido API sobre PostgreSQL emulado con archivos ficticios. Estas pruebas no reemplazan la comprobación del proyecto Supabase real, de RLS, aislamiento, certificados y cuota. La conexión real está pendiente de la creación y configuración del proyecto del titular. Los resultados anteriores corresponden a la versión local.

Ejecución conjunta de tests/system.test.cjs y tests/cloud.test.cjs: **17 pruebas reportadas, 17 aprobadas y 0 fallidas**. Incluye la regresión SQLite y las cuatro pruebas nuevas. Runtime utilizado en esta ejecución: Node.js 24.22.1. La prueba emulada valida el contrato SQL y recorrido API; no valida el servicio de Supabase real ni sustituye la aceptación posterior de la migración.

## Requerimientos funcionales

| ID | Requerimiento | Criterio de aceptación |
|---|---|---|
| RF01 | Autenticación individual | Cuenta válida abre su portal; cuenta inválida no ingresa |
| RF02 | Cambio de contraseña | Acceso inicial obliga a cambiar temporal; se revocan sesiones previas |
| RF03 | Administración de usuarios | Admin crea, edita, desactiva y restablece; otros perfiles no |
| RF04 | Gestión de estancias | Admin vincula cuentas activas de practicante y asesor |
| RF05 | Registro y envío | Practicante registra solo en sus estancias y con datos válidos |
| RF06 | Evidencias | Archivo permitido hasta 2 MB se conserva y descarga solo con permiso |
| RF07 | Revisión | Asesor asignado aprueba o pide corrección con comentario |
| RF08 | Reenvío | Solo borrador/corrección puede editarse; conserva historial |
| RF09 | Avance | Solo horas aprobadas suman; no se duplican por repetir una revisión |
| RF10 | Reportes | Resumen por estancia, CSV e impresión/PDF |
| RF11 | Auditoría | Administrador consulta eventos; otros no acceden |
| RF12 | Persistencia y respaldo | Datos y evidencias permanecen tras reinicio y en respaldo |

## Requerimientos no funcionales

| ID | Requerimiento | Implementación / límite |
|---|---|---|
| RNF01 | Identidad visual | Logotipo, paleta azul y estructura del portal de referencia |
| RNF02 | Seguridad de acceso | Scrypt, cookies HttpOnly, CSRF, verificación de asignaciones y bloqueo de intentos |
| RNF03 | Integridad | FK, restricciones, transacciones, versiones de edición y validación en servidor |
| RNF04 | Portabilidad | Node.js 24, SQLite, sin dependencias npm adicionales |
| RNF05 | Usabilidad | Etiquetas de formularios, mensajes de error y navegación adaptable |
| RNF06 | Mantenibilidad | Módulos separados, esquema SQL, pruebas automatizadas y manuales |

No se establecieron ni midieron acuerdos de disponibilidad, capacidad concurrente o tiempos máximos para una operación institucional. Deben definirse antes de publicar; no se presentan como resultados ya alcanzados.

## Pruebas automatizadas ejecutadas

Comando: node --test tests/system.test.cjs. Entorno: Windows, Node.js 24.19.0. Resultado de la ejecución: **13 pruebas reportadas, 13 aprobadas, 0 fallidas** (un contenedor de integración y 12 subpruebas). Los datos se crean en una base aislada tests/tmp-*.

| Grupo | Verificaciones | Resultado |
|---|---|---|
| Acceso anónimo y archivos internos | Sin sesión recibe 401; archivos de servidor, credenciales, base y respaldo de maqueta no son públicos | Aprobado |
| Contraseña temporal | Bloqueo hasta cambiarla, contraseña derivada en base y rotación de cookie | Aprobado |
| Asignaciones y CSRF | Filtrado de estancias, rechazo de escritura sin token, otro origen y estancias ajenas | Aprobado |
| Validación y archivos | Horas negativas/excesivas/fraccionamiento inválido, fechas imposibles/futuras, estado falso y PDF falso rechazados; TXT persiste y tiene acceso restringido | Aprobado |
| Corrección y aprobación | Solo asesor asignado, comentario mínimo, reenvío, control de versión, bloqueo de doble aprobación y edición posterior | Aprobado |
| Revisiones simultáneas | Dos solicitudes concurrentes producen una aprobación y un conflicto; se guarda una sola revisión | Aprobado |
| Borradores y auditoría | Asesor no ve ni descarga borradores; auditoría solo admin | Aprobado |
| Usuarios y estancias | Alta, correo duplicado, asignación, restricción de rol y revocación al desactivar | Aprobado |
| Respaldo | Copia contiene actividad aprobada y bytes de evidencia | Aprobado |
| Salida | La cookie anterior deja de autorizar | Aprobado |
| Intentos fallidos | Bloqueo después de diez errores | Aprobado |
| Persistencia | Reabrir SQLite conserva registros; integrity_check devuelve ok | Aprobado |

## Pruebas manuales y evidencia

En la maqueta anterior, el usuario confirmó registro, aprobación, suma de horas y CSV/PDF. Esa comprobación no se usa para afirmar que los tres nuevos perfiles ya fueron aceptados por ICASYS.

En la versión 2.0 se revisó visualmente la nueva pantalla de ingreso en navegador. En una instancia aislada con cuentas ficticias se verificaron inicio y cierre de sesión, envío de una actividad desde el practicante, aprobación con otra cuenta de asesor, edición de estancia y visualización de Usuarios con administrador. Los permisos y flujos del servidor se verificaron con las pruebas anteriores. La aceptación final de los nuevos flujos completos corresponde al residente y sus asesores.

## Guion de aceptación con los tres perfiles

1. Ingresa personalmente como administrador y cambia su contraseña temporal.
2. Revisa Usuarios y Gestionar estancias. Confirma cuentas y asignación inicial.
3. Cierra sesión. Ingresa como practicante y cambia su contraseña temporal.
4. Registra una actividad de 2 horas y adjunta un TXT de prueba. Guarda primero como borrador, luego edita y envía.
5. Cierra sesión. Ingresa como asesor y cambia su contraseña temporal.
6. Solicita una corrección con comentario. Regresa al practicante, corrige y reenvía.
7. Regresa al asesor y aprueba. Con el practicante confirma 2 horas aprobadas y el historial.
8. Genera CSV y PDF desde Mis reportes. Compara los totales.
9. Reinicia el servidor y verifica persistencia.
10. Como admin crea un segundo practicante y asesor con una estancia diferente. Comprueba que no vean expedientes ajenos.
11. Ejecuta el respaldo y prueba una restauración en otra carpeta, sin sobrescribir la original.

Registrar fecha, evaluador, resultado y observaciones en una hoja de aceptación. No se han inventado firmas ni una aprobación institucional.

## Pendientes antes de una entrega institucional

- Confirmar reglas de horas y periodo con ICASYS y la universidad.
- Completar datos académicos y formato oficial del informe.
- Evaluar accesibilidad con usuarios reales, concurrencia y volumen de evidencias previsto.
- Definir política de datos, retención, operación, HTTPS y respaldo externo.
- Recabar aceptación de los tres perfiles y documentar incidencias reales.

