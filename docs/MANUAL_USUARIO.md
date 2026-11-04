# Manual de usuario

**Sistema de seguimiento de prácticas profesionales · ICASYS**  
Versión 2.0 · 18 de octubre de 2026 · Entorno local de evaluación

## 1. Para qué sirve

El sistema centraliza actividades, horas, evidencias y revisiones de una estancia profesional. Cada usuario ingresa con su propia cuenta. Las horas pendientes y las horas aprobadas se muestran por separado. Solo una aprobación del asesor asignado suma al avance.

## 2. Ingresar por primera vez

1. Inicia el servidor con INICIAR.cmd y deja la ventana abierta.
2. Abre http://127.0.0.1:4173 en tu navegador.
3. Ingresa el correo y la contraseña temporal entregados por el administrador.
4. La primera vez se solicitará cambiar la contraseña. Escribe la temporal, una nueva y su confirmación.
5. La nueva contraseña debe tener entre 12 y 128 caracteres, mayúscula, minúscula y número. No uses la misma contraseña temporal.
6. Al guardar, se abrirá tu portal. Si no tienes una estancia asignada, aparecerá un mensaje para solicitarla al administrador.

Las cuentas iniciales son admin@icasys.local, asesor@icasys.local y practicante@icasys.local. Sus contraseñas se generan individualmente en data/accesos-iniciales.txt al primer inicio. No son cuentas de correo reales ni cuentas del sitio de ICASYS.

## 3. Elementos comunes

- Inicio: resumen de la estancia, horas y avance.
- Mis prácticas / Revisar actividades: bitácora con búsqueda por título y filtro de estado.
- Mis reportes: resumen por estancia y exportaciones.
- Mi cuenta: permite cambiar tu contraseña. Esto cierra las otras sesiones de tu cuenta.
- Actualizar datos: consulta los últimos cambios del servidor, por ejemplo después de que tu asesor apruebe una entrega.
- Cerrar sesión: invalida la sesión actual. Para probar otro perfil, cierra e inicia con otra cuenta.

Una sesión dura hasta ocho horas. En un equipo compartido utiliza Cerrar sesión al terminar. Las pestañas del mismo navegador comparten sesión: para pruebas simultáneas usa navegadores o perfiles separados.

## 4. Administrador

### 4.1 Crear una cuenta

En Usuarios, pulsa Crear usuario. Captura nombre, correo, perfil y contraseña temporal. El correo debe ser único. Entrega la contraseña al titular por un medio privado. El usuario tendrá que cambiarla al primer ingreso.

Los perfiles son Practicante, Asesor y Administrador. El rol no se cambia desde la edición para evitar que las asignaciones existentes pierdan consistencia. Para un nuevo rol crea una cuenta con correo distinto y revisa las asignaciones.

### 4.2 Editar o desactivar

En Usuarios, pulsa Editar. Puedes modificar nombre, correo y estado. Si capturas una nueva contraseña temporal, la anterior deja de funcionar y se cierran las sesiones del titular. El sistema no muestra contraseñas actuales.

Desactivar una cuenta bloquea nuevos ingresos y cierra sesiones existentes. El historial no se elimina. No puedes desactivar tu propia cuenta.

### 4.3 Registrar una estancia

1. Crea primero la cuenta del practicante y la del asesor, ambas activas.
2. En Gestionar estancias, pulsa Nueva estancia.
3. Selecciona al practicante y al asesor por sus cuentas.
4. Captura institución educativa, proyecto, fechas y horas requeridas.
5. Guarda la estancia. Al iniciar sesión, el practicante la encontrará en su portal y el asesor en su lista de asignaciones.

Las horas requeridas pueden estar entre 1 y 2000 en incrementos de media hora. El periodo debe ser válido. Cuando ya existen actividades, no se puede cambiar al titular ni excluir sus fechas al editar el periodo. Se puede reasignar el asesor; las revisiones anteriores conservan el nombre de quien las realizó.

### 4.4 Consultar historial

Historial del sistema muestra los últimos 200 eventos: ingresos, cambios de contraseña, gestión de usuarios, estancias y actividades. Las fechas de auditoría están en UTC, identificadas en la tabla. No se registran contraseñas ni el contenido de archivos en el historial.

## 5. Practicante

### 5.1 Registrar una actividad

1. Abre Mis prácticas y, si tienes varias estancias propias, selecciona la correcta.
2. Pulsa Registrar actividad.
3. Captura nombre, fecha, horas y descripción. Explica el trabajo y el resultado.
4. Opcionalmente adjunta un PDF, PNG, JPG o TXT de hasta 2 MB.
5. Guarda un borrador para continuar después o pulsa Enviar al asesor.

La descripción requiere entre 15 y 3000 caracteres. Cada actividad acepta entre 0.5 y 12 horas en incrementos de media hora. La fecha debe pertenecer al periodo de tu estancia y no puede ser futura. La suma de actividades enviadas del mismo día y estancia no puede superar 12 horas. Los borradores no suman al avance ni son visibles para el asesor.

### 5.2 Estados

| Estado | Qué significa | Qué puedes hacer |
|---|---|---|
| Borrador | Todavía no se entrega | Editar y enviar |
| En revisión | Entregada al asesor | Consultar y esperar revisión |
| Corrección | El asesor solicita ajustes | Leer comentario, editar y reenviar |
| Aprobada | Horas validadas | Consultar y descargar evidencia |

No se editan actividades en revisión ni aprobadas. Esta regla evita modificar una entrega después de su revisión.

### 5.3 Atender una corrección

Abre Ver detalle de la actividad con estado Corrección. Lee el historial, pulsa Editar y reenviar, modifica lo solicitado y envía. Puedes conservar la evidencia anterior sin seleccionar otro archivo; elegir uno nuevo la reemplaza. Las horas se sumarán solo después de aprobarse.

El historial conserva decisiones y comentarios, pero no guarda copias completas de cada versión del texto o archivo. No se ofrece eliminación de actividades en esta versión.

## 6. Asesor

Solo aparecen las estancias asignadas a tu cuenta y las actividades entregadas de esos practicantes.

1. Abre Revisar actividades y selecciona la estancia.
2. Filtra En revisión y pulsa Revisar.
3. Lee descripción, horas e historial. Descarga la evidencia si existe.
4. Para aprobar, agrega un comentario opcional y pulsa Aprobar horas.
5. Para solicitar cambios, escribe una indicación de al menos 10 caracteres y pulsa Solicitar corrección.

Una actividad aprobada deja de estar pendiente; pulsar nuevamente desde una pestaña desactualizada no duplicará las horas. Si recibes un aviso de versión modificada, cierra el detalle, actualiza los datos y revisa otra vez.

## 7. Reportes

En Mis reportes se muestran nombre del practicante, proyecto, asesor, periodo, horas aprobadas, horas en revisión, meta y avance. El porcentaje se redondea al entero más cercano y su indicador se limita a 100%; las horas aprobadas siguen mostrándose completas.

- Descargar CSV produce una tabla para Excel y otros programas. Si Excel no separa columnas, usa Datos → Desde texto/CSV y selecciona UTF-8 y delimitador coma.
- Imprimir / PDF abre la función de impresión del navegador. Selecciona Guardar como PDF. El formato impreso oculta la navegación del portal.

El reporte es de seguimiento y no sustituye una constancia oficial ni incluye firma electrónica.

## 8. Problemas frecuentes

| Mensaje o situación | Acción |
|---|---|
| El navegador rechaza la conexión | Ejecuta INICIAR.cmd y revisa la dirección y el puerto |
| Correo o contraseña incorrectos | Revisa la cuenta; pide restablecimiento al administrador si es necesario |
| Demasiados intentos | Espera 15 minutos; no sigas intentando contraseñas |
| Sin estancia asignada | Pide al administrador que registre la asignación correcta |
| No aparecen horas nuevas | Pulsa Actualizar datos; comprueba que estén aprobadas |
| Archivo rechazado | Revisa tamaño, extensión y contenido real del archivo |
| La actividad cambió | Actualiza datos antes de volver a editar o revisar |
| Sesión vencida | Inicia sesión nuevamente |

La información ahora se guarda en el servidor: limpiar el navegador no elimina actividades. La carpeta data del servidor sí debe conservarse y respaldarse.
