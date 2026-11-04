# Conectar ICASYS con Supabase

Versión 3.0 preparada el 26 de octubre de 2026.

## Estado actual

**Actualización del 1 de noviembre de 2026:** la conexión real fue verificada, DB_DRIVER se cambió a postgres y se importaron las 3 cuentas y 1 estancia locales. Storage permanece privado. Consulta ESTADO_ACTUAL.md. La aplicación todavía se ejecuta localmente y no ha sido publicada. Los pasos siguientes se conservan como guía para una nueva instalación; no deben repetirse sobre la base que ya tiene usuarios.

Las pruebas de SQL emulado no certifican TLS, políticas, bloqueos ni permisos del proyecto real. Esas comprobaciones son parte de la conexión y aceptación posteriores.

## 1 Crear el proyecto

En https://supabase.com/ crea tu cuenta e inicia sesión personalmente. Crea un proyecto nuevo llamado **icasys-practicas** con el plan gratuito. Selecciona la organización de tu cuenta y una región adecuada. Define y conserva la contraseña de la base de datos de forma privada. Espera a que termine de prepararse.

No es necesario comprar un dominio ni introducir datos de pago para esta configuración del proyecto gratuito. Si la plataforma ofrece un plan de pago o te solicita un compromiso adicional, revisa la opción elegida antes de continuar.

## 2 Crear tablas y depósito privado

En **SQL Editor** ejecuta, en orden, el contenido de estos archivos del proyecto:

1. supabase/01-schema.sql
2. supabase/02-storage.sql

El primero crea el esquema privado **icasys** con usuarios, estancias, actividades, metadatos de evidencias, revisiones, sesiones, intentos de acceso, auditoría y diario de cargas. No crea cuentas de aplicación ni contiene contraseñas. Al consultar tablas desde Table Editor, selecciona el esquema icasys en lugar de public.

El segundo crea el depósito **icasys-evidencias**, marcado como privado, con límite de 2 MB y los tipos permitidos. No crea políticas de acceso público. Si el depósito ya existía no cambia su configuración; el diagnóstico verificará que sea privado.

No agregues icasys a los esquemas expuestos por Data API. No concedas lectura de las tablas a anon ni authenticated. Los usuarios de nuestra aplicación no son usuarios de Supabase Auth: se conserva el ingreso existente de Node.js con contraseñas derivadas y roles propios. No se crea un segundo sistema de autenticación.

## 3 Configurar credenciales solo en el servidor

Copia .env.example como **.env** en la raíz del proyecto. Este archivo está excluido del control de versiones y de las rutas públicas. Llénalo personalmente, sin pegar credenciales en el chat ni en capturas:

```dotenv
DB_DRIVER=postgres
DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:5432/postgres
PG_CA_FILE=C:/ruta/privada/certificado-raiz.crt
SUPABASE_URL=https://REFERENCIA.supabase.co
SUPABASE_SERVICE_ROLE_KEY=CLAVE_PRIVADA_SERVICE_ROLE
SUPABASE_STORAGE_BUCKET=icasys-evidencias
PORT=4173
HOST=127.0.0.1
APP_ORIGIN=http://127.0.0.1:4173
COOKIE_SECURE=0
```

**DATABASE_URL:** en el botón Connect del proyecto copia la conexión de **Session pooler**, normalmente en puerto 5432. Es adecuada para este servidor Node persistente y puede funcionar desde redes IPv4. Copia el usuario y host exactos que muestre tu proyecto. Sustituye la contraseña localmente; si contiene símbolos reservados, codifícala para una URL. No uses la URL de Data API en este campo.

**PG_CA_FILE:** descarga el certificado raíz de la base desde la configuración SSL del proyecto si el certificado no está en las autoridades confiables del runtime. La ruta debe existir en el equipo que ejecuta Node; en el servicio publicado será otra ruta. No se desactiva la validación TLS ni se usa rejectUnauthorized:false. El controlador retira parámetros sslmode de la URL para que no reemplacen la configuración de validación.

**SUPABASE_URL:** origen HTTPS del proyecto, sin rutas. **SUPABASE_SERVICE_ROLE_KEY:** clave privada legacy service_role del proyecto para Storage; no es anon ni publishable. Solo el servidor la utiliza, después de autorizar cada solicitud. La clave tiene privilegios elevados y no debe agregarse a app.js, index.html, repositorios ni variables públicas. Si se usa una clave secreta de formato diferente, debe verificarse compatibilidad con Storage antes de cambiar el tipo documentado.

Si aún no tienes estos valores, conserva DB_DRIVER=sqlite. No uses credenciales ficticias como si la migración ya estuviera conectada.

## 4 Instalar y comprobar

En otro equipo instala Node.js 24 y ejecuta npm install. En este equipo las dependencias ya se instalaron con pnpm y existe un archivo de bloqueo pnpm-lock.yaml. Para reproducir las versiones exactas usa pnpm install --frozen-lockfile.

Ejecuta:

```powershell
npm run cloud:check
```

Debe confirmar conexión PostgreSQL con validación TLS, tablas presentes y depósito privado. El diagnóstico no imprime claves ni cadenas de conexión. Si falla, revisa archivo .env, estado del proyecto, contraseña, certificado y scripts SQL. No desactives TLS para resolverlo.

## 5 Elegir una inicialización

Elige **una** de estas opciones en una base de destino vacía. No se sobrescriben usuarios existentes.

### Conservar registros locales

Primero respalda la instalación SQLite y detén las escrituras durante la copia. La importación lee el archivo local sin modificarlo. Luego ejecuta:

```powershell
npm run cloud:import
```

Copia usuarios y hashes de contraseña, estancias, actividades, revisiones y archivos al depósito privado. Las contraseñas actuales siguen funcionando. No copia sesiones ni intentos de acceso. La auditoría anterior permanece en el respaldo local y se registra un evento de importación en la nube. No borres el respaldo.

La importación sube archivos antes de confirmar los registros SQL. Si una carga o transacción falla, no presenta éxito; las cargas quedan registradas en storage_uploads para revisión. No se borran automáticamente documentos. Antes de reintentar revisa la causa y el destino.

### Crear una instalación nueva

Si no deseas copiar datos locales:

```powershell
npm run cloud:init
```

Crea las tres cuentas iniciales y una estancia de evaluación. Las contraseñas temporales se guardan en **data/accesos-nube.txt**, nunca en pantalla pública. Cada titular debe cambiarlas personalmente al ingresar. No ejecutes este comando si vas a usar cloud:import.

## 6 Iniciar y probar

Inicia con INICIAR.cmd o npm start. La terminal debe indicar **Motor: postgres**. Si falla la nube no cambia silenciosamente a SQLite.

Prueba acceso con los tres perfiles, cambio de contraseña, registro, corrección, aprobación, descarga de evidencias y reportes. Consulta las filas en Supabase y confirma que las evidencias no sean accesibles mediante una URL pública. Reinicia Node y verifica que se conserven los datos.

Comando de auditoría de cargas sin confirmación:

```powershell
npm run cloud:storage-audit
```

Es de solo lectura y no elimina objetos. Al reemplazar una evidencia se conserva el objeto privado anterior hasta una limpieza controlada; puede ocupar cuota adicional. La tabla evidence apunta únicamente al archivo actual. El diario detecta cargas sin confirmación, no todos los objetos históricos reemplazados.

## 7 Respaldos en nube

El comando npm run backup corresponde a SQLite y no debe confundirse con un respaldo Supabase. En nube hay dos componentes separados: PostgreSQL y Storage. Un volcado de las tablas no incluye los bytes de los archivos.

Define un procedimiento de copia PostgreSQL con pg_dump o las herramientas admitidas por el plan contratado y una copia independiente de los archivos privados. Prueba la restauración en otro proyecto antes de confiar en el procedimiento. No se han configurado respaldos automáticos ni se afirma que el plan gratuito los incluya. El archivo local SQLite conservado permite recuperar el punto previo a la migración, no la actividad posterior en nube.

## 8 Publicar la aplicación posteriormente

La base de datos en nube no publica por sí sola la interfaz Node. Para que los asesores entren desde otros equipos falta alojar el servidor en un servicio compatible y configurar sus secretos. Se incluye un Dockerfile como preparación; no se ha construido ni desplegado una imagen en esta etapa.

En ese servicio utiliza HOST=0.0.0.0, COOKIE_SECURE=1 y APP_ORIGIN con la dirección HTTPS exacta del sitio. El puerto será el que asigne el proveedor. Conserva DATABASE_URL y la clave privada solo en las variables secretas del servidor. La conexión PostgreSQL valida el certificado. No ejecutes la app con .env dentro de una imagen pública.

## Arquitectura de la versión preparada

```text
Navegador → Servidor Node.js → PostgreSQL Supabase (esquema icasys)
                       └──→ Storage Supabase (depósito privado)
```

Las evidencias se descargan a través de nuestra API, que comprueba la cuenta y estancia y verifica su SHA-256. No se devuelve una URL pública ni la clave de servicio al navegador.

## Referencias

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/storage/security/access-control
- https://node-postgres.com/features/transactions
- https://node-postgres.com/features/ssl
