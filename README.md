# ICASYS · Sistema de prácticas profesionales

Versión 3.0 conectada a Supabase · Proyecto de residencia · Aplicación independiente del sitio institucional.

## Supabase y estado de la migración

**El 1 de noviembre de 2026 se verificó la conexión real y se migraron las 3 cuentas y 1 estancia locales a PostgreSQL.** El motor activo es postgres y el depósito de evidencias es privado. La aplicación Node sigue ejecutándose localmente; su publicación por Internet continúa pendiente. Consulta [Estado actual](docs/ESTADO_ACTUAL.md).

Sigue [Conectar ICASYS con Supabase](docs/SUPABASE.md). Incluye creación de tablas, depósito privado, .env, diagnóstico y las opciones de importar registros existentes o crear una instalación nueva. El directorio respaldo-v2 conserva el servidor anterior. No se borraron los registros locales.

Ahora se requiere instalar dependencias (`npm install`, o `pnpm install --frozen-lockfile` para versiones exactas). En este equipo ya están instaladas. El controlador de producción es pg; los archivos y claves de conexión se configuran solo en el servidor. Esta versión conserva nuestra autenticación propia, sin sustituirla por Supabase Auth.

Los manuales v2 siguientes describen la operación local original; SUPABASE.md documenta los cambios v3 y las diferencias de respaldo. ESTADO_ACTUAL.md registra la migración verificada y los próximos pasos. No ejecutes cloud:init ni repitas cloud:import sobre la base ya migrada.

## Comenzar

1. Ejecuta **INICIAR.cmd**. En este equipo utiliza el Node.js disponible; en otro equipo instala Node.js 24 y usa `npm start`.
2. Abre http://127.0.0.1:4173.
3. En el primer inicio se crean tres cuentas con contraseñas aleatorias, en **data/accesos-iniciales.txt**. Ese archivo es privado y no se sirve por HTTP.
4. Ingresa con la cuenta correspondiente y establece una contraseña nueva. Los cambios de contraseña se realizan personalmente en la pantalla del sistema.
5. El administrador configura usuarios y estancias. El practicante entrega actividades y el asesor asignado revisa.

En modo local se utiliza SQLite mediante Node.js 24, sin instalar un servicio de base de datos. En modo nube se requiere instalar las dependencias y configurar Supabase como explica la guía. Los datos no dependen del almacenamiento del navegador.

## Documentación entregada

Abre **docs/DOCUMENTACION.html** para consultar todos los manuales en un solo expediente navegable e imprimible. Con el servidor activo también está en http://127.0.0.1:4173/documentacion.

- [Manual de usuario](docs/MANUAL_USUARIO.md): acceso, administrador, practicante, asesor y reportes.
- [Manual de instalación y operación](docs/INSTALACION.md): instalación, respaldos, recuperación y diagnóstico.
- [Manual técnico](docs/MANUAL_TECNICO.md): arquitectura, permisos, API, decisiones y mantenimiento.
- [Modelo de datos](docs/BASE_DE_DATOS.md): relaciones, diccionario y esquema SQL.
- [Requerimientos y pruebas](docs/PRUEBAS.md): alcance, criterios y resultados verificados.
- [Documento base de residencia](docs/PROYECTO_RESIDENCIA.md): problema propuesto, objetivos, metodología, resultados y pendientes académicos.

Los manuales son editables en Markdown. El informe requiere completar los datos de tu escuela, asesores, periodo real y formato institucional; no se inventan firmas, métricas de impacto ni validaciones de ICASYS.

## Estructura

```text
server.cjs                 Servidor HTTP y API con controles de acceso
lib/database.cjs           Apertura de SQLite y configuración inicial
lib/schema.sql             Modelo relacional y restricciones
lib/auth.cjs               Contraseñas y sesiones
lib/validation.cjs         Validación de datos en servidor
app.js / index.html        Interfaz de usuario
styles.css / assets/       Identidad visual
data/icasys.sqlite         Base de datos privada (creada al iniciar)
data/accesos-iniciales.txt  Credenciales temporales privadas
backup.cjs                 Respaldo consistente de SQLite
tests/system.test.cjs      Pruebas automatizadas de integración
docs/                      Manuales y expediente del proyecto
respaldo-maqueta/          Copia del prototipo anterior (no publicada)
```

## Verificación y mantenimiento

```powershell
npm test
npm run backup
```

Si `npm` no está instalado en tu PATH, usa el Node que utiliza INICIAR.cmd: `node --test tests/system.test.cjs` y `node backup.cjs`, sustituyendo `node` por su ruta completa. Nunca borres data para resolver un error de inicio.

## Cambio respecto de la primera maqueta

Se retiró el selector libre de perfiles y el almacenamiento en localStorage. Ahora cada cuenta tiene permisos comprobados en el servidor y los registros quedan en SQLite. Las actividades anteriores de la maqueta permanecen en el almacenamiento anterior de tu navegador, pero no se importan automáticamente como registros aprobados porque no tenían identidad ni revisión autenticada. La copia del código anterior está en respaldo-maqueta.

## Límites de esta entrega

Preparada para evaluación local de residencia. No está desplegada en Internet ni integrada al sitio de ICASYS. No incorpora correo de recuperación, notificaciones, firma electrónica, antivirus de archivos ni certificados oficiales. Para una publicación institucional se requiere revisar infraestructura, HTTPS, respaldos externos, retención y tratamiento de datos con responsables de ICASYS. Los permisos del sistema operativo protegen el archivo de base de datos; su contenido no está cifrado en reposo.

Fuente Inter consultada del sitio y cargada desde Google Fonts, con alternativa Arial. Logotipo público de https://icasys.mx/imagenes/Isotipo/blanco.png para esta propuesta. No se transfieren registros del sistema a esos servicios; el navegador sí solicita los recursos tipográficos externos.
