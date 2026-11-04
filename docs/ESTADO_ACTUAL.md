# Estado de la instalación ICASYS

Actualizado el 1 de noviembre de 2026, hora de Ciudad de México.

## Instalación conectada

- Motor activo en .env: postgres.
- PostgreSQL Supabase: conexión TLS con certificado verificado.
- Certificado: prod-ca-2021.crt; su ruta se configuró en PG_CA_FILE.
- Esquema ICASYS: disponible y comprobado.
- Storage: depósito de evidencias comprobado como privado.
- Servidor Node.js: disponible localmente en http://127.0.0.1:4173.

La base está en la nube. La aplicación Node todavía corre en la computadora del residente; no se ha publicado una URL accesible desde otros equipos ni se ha modificado la página institucional.

## Migración realizada

Se creó un respaldo consistente de SQLite antes de importar. Se conservaron el archivo original y el respaldo en data/respaldos. Se copió el contenido a un destino Supabase vacío y después se verificaron los conteos:

| Entidad | Origen SQLite | Destino PostgreSQL |
|---|---:|---:|
| Usuarios | 3 | 3 |
| Estancias | 1 | 1 |
| Actividades | 0 | 0 |
| Revisiones | 0 | 0 |
| Evidencias | 0 | 0 |

La base SQLite no contenía actividades ni archivos. Los registros de la primera maqueta guardados en el navegador no formaban parte de esta base ni se importaron como aprobaciones autenticadas.

La importación conservó los hashes de contraseña de las cuentas existentes. No se copiaron sesiones ni intentos de ingreso. Se registró un evento sqlite_import_completed en PostgreSQL; la auditoría previa permanece en la copia SQLite.

## Comprobación real de acceso

Se verificó mediante la API real de la aplicación el ingreso de administrador, asesor y practicante con sus credenciales temporales. Los tres devolvieron el perfil correcto y la obligación de cambiar la contraseña. Todas las sesiones de comprobación se cerraron. No se cambiaron contraseñas ni se crearon actividades ficticias.

Los valores privados permanecen en .env y data/accesos-iniciales.txt, excluidos de publicación y control de versiones. No se incluyen en este expediente.

## Próximas comprobaciones con el usuario

1. Entrar personalmente a cada cuenta y cambiar la contraseña temporal.
2. Revisar datos de la estancia y nombres de los responsables.
3. Registrar una actividad y evidencia con el practicante; solicitar corrección y aprobar con el asesor.
4. Confirmar la actividad, revisión y evidencia en Supabase, además de CSV y PDF.
5. Definir y probar respaldos de PostgreSQL y archivos privados. El respaldo SQLite conserva el estado previo, no las nuevas operaciones en la nube.
6. Preparar la publicación del servidor Node para acceso por enlace desde otros equipos, con HTTPS y variables secretas.

Los manuales con referencias a versión 2.0 describen la instalación local anterior. SUPABASE.md documenta la configuración v3; este archivo registra el estado real más reciente. No es necesario repetir cloud:init ni cloud:import en una base que ya tiene usuarios.
