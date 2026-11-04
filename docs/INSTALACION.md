# Manual de instalación y operación

Versión 2.0 · Entorno validado: Windows y Node.js 24.19.0

## Requisitos

- Node.js 24.x (el proyecto utiliza el módulo integrado node:sqlite; no se garantiza compatibilidad con otras versiones).
- Navegador moderno con cookies habilitadas.
- Permiso de lectura y escritura en la carpeta del proyecto y data.
- Puerto local 4173 disponible. No se requiere instalar dependencias npm.

Node.js 24 incorpora node:sqlite, que puede mostrar avisos experimentales según su versión. Se mantiene el runtime validado como requisito del proyecto; una actualización debe pasar de nuevo las pruebas.

## Instalación en este equipo

La carpeta es C:\Users\Lenovo\OneDrive\Documentos\ChatGPT\Proyecto ICASIS.

Haz doble clic en INICIAR.cmd. El archivo utiliza primero el runtime disponible en el perfil del usuario; si no existe, intenta usar node del PATH. Mantén su terminal abierta y entra a http://127.0.0.1:4173.

Si ya hay una instancia ejecutándose en segundo plano, la nueva indicará que el puerto está en uso. No inicies un segundo servidor para la misma base. No detengas procesos de Node sin comprobar que pertenecen a este proyecto.

## Instalación en otro equipo

1. Instala Node.js 24 desde su sitio oficial.
2. Copia el código del proyecto. Para una instalación nueva no copies data ni accesos de otra persona.
3. Abre una terminal en la carpeta y ejecuta:

```powershell
node --version
npm start
```

En el primer arranque se crea data/icasys.sqlite, el esquema y las tres cuentas iniciales. Las contraseñas aleatorias están en data/accesos-iniciales.txt. Cambia cada contraseña al ingresar; conserva el archivo solo mientras se entregan los accesos y retíralo después de manera controlada. El servidor nunca publica ese archivo.

## Configuración

| Variable | Predeterminado | Uso |
|---|---|---|
| PORT | 4173 | Puerto HTTP local |
| DATA_DIR | carpeta data del proyecto | Ubicación de la base y configuración inicial |
| COOKIE_SECURE | sin activar | Con valor 1 exige envío de cookie por HTTPS |

Ejemplo de evaluación en otro puerto:

```powershell
$env:PORT = '4180'
node server.cjs
```

La aplicación escucha exclusivamente en 127.0.0.1. No está expuesta a Internet ni a la red local. El modo HTTPS requiere un proxy o infraestructura de despliegue y no forma parte del arranque local. No actives COOKIE_SECURE en una demostración HTTP, porque el navegador puede impedir que funcione la sesión.

## Arranque y parada

Si ejecutaste desde terminal, Ctrl + C detiene el servidor. Antes de reiniciar confirma que no haya formularios en envío. Los datos se conservan. Si el servidor fue iniciado en segundo plano por una herramienta, identifica su proceso y ruta antes de detener únicamente esa instancia.

## Respaldo

Ejecuta desde la carpeta del proyecto:

```powershell
npm run backup
```

El respaldo consistente se guarda en data/respaldos/icasys-FECHA.sqlite. Incluye usuarios, hashes de contraseña, sesiones, estancias, actividades, evidencias, revisiones y auditoría. No se limita a copiar el archivo principal mientras hay escrituras: usa la API de respaldo de SQLite.

Los respaldos son privados. Guarda una copia protegida fuera de la computadora y prueba su restauración periódicamente. La frecuencia y retención deben acordarse con el responsable; se propone un respaldo por jornada de uso y antes de cambios al sistema. No se configuraron automatizaciones.

## Restauración controlada

1. Detén el servidor y confirma que nadie está trabajando.
2. Conserva la carpeta data actual con otro nombre o una copia en una ubicación protegida. No la borres.
3. Crea una nueva carpeta data-restaurada y coloca el respaldo con nombre icasys.sqlite dentro de ella.
4. Inicia apuntando DATA_DIR a la nueva carpeta, sin superponer archivos -wal o -shm de otra base:

```powershell
$env:DATA_DIR = 'C:\ruta\del\proyecto\data-restaurada'
node server.cjs
```

5. Verifica ingreso, estancias, actividades y descarga de evidencias. Los accesos serán los vigentes al momento del respaldo; usa una contraseña conocida de esa fecha.
6. Para un incidente de seguridad invalida sesiones del respaldo antes de reanudar acceso y aplica restablecimientos con el responsable técnico.

No hay recuperación automática por correo. Un administrador activo puede restablecer la cuenta desde Usuarios. Si se pierde el acceso a todos los administradores, corresponde una intervención técnica controlada y respaldada; no se elimina la base para recrear accesos.

## Pruebas y actualización

Ejecuta npm test antes de entregar una actualización. Las pruebas crean sus propias bases en tests/tmp-* y no usan la información del usuario. La primera versión del esquema está en lib/schema.sql y PRAGMA user_version=1. Cambios futuros requieren migraciones incrementales con copia previa; CREATE TABLE IF NOT EXISTS no sustituye una migración de columnas.

## Entrega y publicación institucional

Para la evaluación local entrega código, manuales y una instalación nueva con cuentas de evaluación. No distribuyas bases con información personal ni archivos de accesos. Una publicación institucional requiere acuerdo de infraestructura, HTTPS, configuración de proxy y cookies, revisión de permisos de archivos, política de datos y retención, respaldo externo y pruebas de concurrencia y carga acordes al uso previsto. No se declara lista para producción pública por haber pasado las pruebas locales.

La carpeta actual está bajo OneDrive. SQLite usa archivos WAL durante la operación; no se debe depender de una sincronización de archivos en uso como respaldo. Para operación institucional usa almacenamiento local del servidor fuera de carpetas sincronizadas y el procedimiento de respaldo consistente.
