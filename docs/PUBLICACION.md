# Publicación con GitHub y Render

Estado: configuración preparada. Todavía no se ha subido el código ni publicado el servicio.

## Repositorio

Crear un repositorio privado en GitHub llamado `icasys-practicas`, sin archivos iniciales. Compartir únicamente su enlace para conectar el repositorio local. No compartir tokens ni contraseñas.

`.gitignore` excluye `.env`, certificados, datos locales, respaldos y dependencias. Antes de subir el código, revisar los archivos que se van a incluir.

## Servicio en Render

1. Entrar a Render y autorizar acceso únicamente al repositorio del proyecto.
2. Crear un Web Service desde ese repositorio con runtime Docker y el Dockerfile incluido. También se puede usar un Blueprint con `render.yaml`.
3. Configurar las variables de `render.yaml`. Los valores de DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY se copian directamente desde el archivo `.env` local a Render, sin pegarlos en GitHub ni en el chat.
4. En Environment, añadir un Secret File con nombre exacto `prod-ca-2021.crt` y el contenido del certificado descargado de Supabase. PG_CA_FILE apunta a `/etc/secrets/prod-ca-2021.crt`.
5. No copiar el APP_ORIGIN local a Render. El servidor utiliza RENDER_EXTERNAL_URL cuando APP_ORIGIN no está definido. Para un dominio propio, configurar APP_ORIGIN con su URL HTTPS exacta.
6. Desplegar o volver a desplegar después de guardar los secretos. No ejecutar cloud:init ni cloud:import: la base existente ya contiene usuarios y actividades.

La aplicación recibe PORT de Render, escucha en todas las interfaces y utiliza cookies seguras. El contenedor no incluye el `.env` ni certificados. Los datos persistentes y las evidencias permanecen en Supabase.

## Verificación tras publicar

Abrir la URL HTTPS desde otro equipo. Ingresar con los tres perfiles, comprobar las restricciones de cada uno y probar registro de actividad, descarga de evidencia, revisión y reportes. Cerrar sesión y confirmar que ya no se puede consultar información privada. No considerar terminado el despliegue hasta completar estas comprobaciones.

El plan gratuito puede suspender el servicio por inactividad y tardar en responder al volver a abrirlo. Es adecuado para la demostración académica; revisar los límites y las necesidades de disponibilidad antes de uso institucional.

Referencias: https://render.com/docs/free y https://render.com/docs/configure-environment-variables.
