# Acceso y recuperación con Supabase Auth

Preparación del 21 de noviembre de 2026. Este es el método elegido por el residente para continuar, en lugar de activar Brevo. La integración se preparó con pruebas de proveedor simulado. La vinculación real y la recepción de un correo todavía deben comprobarse con el usuario.

## Preparación y activación

1. Aplicar `supabase/04-auth-link.sql` en la base existente antes de desplegar el código. Agrega la referencia única `auth_user_id`; no crea cuentas ni cambia contraseñas. El script `scripts/cloud-auth-migrate.cjs` permite aplicarla desde la computadora del responsable con el `.env` privado.
2. En Supabase → Authentication → URL Configuration, configurar Site URL **sin barra al final**:

   `https://icasys-practicas.onrender.com`

   Añadir `https://icasys-practicas.onrender.com/` a las Redirect URLs permitidas.
3. Conservar la plantilla predeterminada de Reset password. El panel solo permite editarla con SMTP personalizado; no hace falta activar SMTP para usar el envío de prueba del propio Supabase. El portal solicita la recuperación con PKCE s256 y procesa el retorno `/?code=...` de la plantilla estándar.
4. En Render → Environment, agregar **SUPABASE_AUTH_ENABLED=1** y mantener **MAIL_RECOVERY_ENABLED=0**. No se necesita una clave nueva de Brevo ni publicar claves de Supabase; el servidor utiliza la configuración privada existente.
5. Guardar y desplegar. Confirmar Live antes de continuar.

## Vincular una cuenta existente

1. El administrador asigna a cada cuenta una dirección de correo real bajo control del titular en Usuarios → Editar. Cada cuenta debe tener un correo distinto.
2. El titular inicia sesión con la cuenta existente y su contraseña de ICASYS.
3. En Mi cuenta, escribe su contraseña **actual de ICASYS**, no la de Gmail, y pulsa Vincular mi cuenta con Supabase.
4. El servidor vuelve a verificar la contraseña, crea la identidad Auth y guarda la referencia. Conserva la misma contraseña en Supabase Auth y reemplaza el hash local por un valor aleatorio inutilizable. No se copian hashes scrypt a bcrypt ni se conservan contraseñas en texto plano.
5. La sesión se renueva. La identidad aparecerá en Authentication → Users. El perfil, el identificador de usuario de ICASYS y todos sus datos permanecen iguales.

No se vincula una identidad preexistente simplemente por tener el mismo correo. Si Supabase indica que el correo ya está registrado, debe revisarlo el responsable técnico; no borrar ni reasignar identidades sin comprobar su titularidad. En esta migración los correos son asignados por el administrador, y se confirman como parte de la transferencia autenticada de una cuenta interna; no equivale a validar un registro público por correo.

Las cuentas aún no vinculadas conservan el acceso local mientras se realiza la transición. Las cuentas nuevas se crean desde Usuarios, cambian su contraseña temporal y se vinculan desde Mi cuenta. No hay registro público ni asignación de perfiles desde metadata de Auth.

## Recuperar por correo

Con la cuenta ya vinculada, cerrar sesión, pulsar Olvidé mi contraseña y solicitar el enlace al correo registrado. Abrir el enlace en el mismo navegador y perfil donde se pidió; la recuperación usa una cookie HttpOnly, SameSite=Lax y Secure en producción que conserva el verificador PKCE durante veinte minutos. La URL solo lleva el código de autorización, que por sí solo no permite cambiar la contraseña. Al abrirlo, el portal retira el código de la barra y muestra el formulario. Al guardar, el servidor canjea código y verificador, Supabase consume el código y actualiza la contraseña; ICASYS invalida sus sesiones. El usuario debe iniciar sesión de nuevo. Si se pidieron varios enlaces, utilizar el último: cada solicitud reemplaza el verificador anterior. Si se perdió la cookie o se abrió en otro navegador, solicitar otro enlace desde ese navegador.

La caducidad la controla la configuración de tokens de correo de Supabase; no se debe asumir el plazo de 20 minutos de la alternativa Brevo. La contraseña debe tener al menos 12 caracteres e incluir mayúscula, minúscula y número. Si el enlace se consume pero después ocurre un error de red o de base de datos, puede ser necesario pedir otro y comprobar si ya cambió la contraseña.

El envío predeterminado de Supabase tiene límites reducidos y únicamente permite destinatarios que son miembros del equipo del proyecto. Un usuario de la aplicación no se convierte por ello en miembro del equipo. No otorgar acceso administrativo al proyecto a alumnos o asesores solo para que reciban correos. Para destinatarios fuera del equipo se requiere configurar SMTP o un Send Email Hook. Usar direcciones Gmail como destinatarios no elimina esta restricción. El responsable puede probar primero con su propio correo miembro del proyecto.

## Seguridad y operación

- Clave service_role solo en el servidor; solicitudes HTTPS con timeout, sin registrar cuerpos ni tokens.
- Vinculación exige sesión autenticada, CSRF, correo real y contraseña actual; no acepta un correo o perfil enviado por el navegador para decidir qué identidad se vincula.
- Los permisos siguen dependiendo del perfil y la asignación guardados en ICASYS, no de metadata editable de Supabase Auth.
- Una identidad Auth sin cuenta ICASYS activa y vinculada no puede entrar ni restablecer una cuenta ajena.
- Después de vincular, si Supabase Auth no está habilitado o no responde no se utiliza una contraseña local como alternativa.
- Cambios administrativos de correo o contraseña de una cuenta vinculada se sincronizan con Auth. Las operaciones atraviesan dos sistemas y no son una transacción distribuida: si falla un guardado tras una operación remota, se debe revisar la vinculación y probar acceso antes de repetir. Una creación remota fallida se compensa cuando puede identificarse de forma segura una identidad nueva sin vinculación local.
- ICASYS conserva sesiones propias con cookies HttpOnly y CSRF. Las sesiones Supabase utilizadas por el servidor para verificar credenciales son transitorias y se cierran; no se almacenan en localStorage.
- Desactivar una cuenta en ICASYS impide el acceso al portal, aunque su identidad siga existiendo en Auth. Cambiar una contraseña fuera del flujo del portal puede no invalidar inmediatamente las cookies independientes de ICASYS: para revocarlas se utiliza la administración del portal.
- Antes de apagar SUPABASE_AUTH_ENABLED, tener presente que las cuentas vinculadas no tendrán acceso con el proveedor deshabilitado. No quitar la vinculación ni restaurar un hash antiguo como atajo.
- Los correos, claves, contraseñas y enlaces reales no deben añadirse a documentación ni capturas públicas.

## Verificación pendiente en la instalación real

Configurar URL y conservar la plantilla predeterminada; habilitar en Render; vincular la cuenta administradora personalmente; comprobar Auth → Users, inicio de sesión, llegada al Gmail, recuperación, rechazo del enlace usado, conservación de los datos y registro password_recovered_supabase. Después repetir con los otros perfiles, resolviendo primero la configuración de envío para sus destinatarios.

Referencias: https://supabase.com/docs/guides/auth/auth-email-templates, https://supabase.com/docs/reference/javascript/auth-verifyotp y https://supabase.com/docs/guides/auth/auth-smtp.
