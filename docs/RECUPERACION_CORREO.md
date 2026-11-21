# Recuperación de acceso por correo real

**Alternativa anterior, no seleccionada:** el residente decidió continuar con Supabase Auth. Seguir SUPABASE_AUTH.md y mantener MAIL_RECOVERY_ENABLED=0. Esta guía de Brevo se conserva como referencia y no debe combinarse con la activación de Auth.

Preparada el 21 de noviembre de 2026. La migración de la tabla privada se aplicó en Supabase. El envío real permanece pendiente de configurar Brevo, verificar el remitente y asignar direcciones reales a los usuarios. Las pruebas automatizadas utilizan un remitente simulado: no prueban entrega en Gmail.

## Configuración del envío

1. Crear una cuenta en https://www.brevo.com/ y completar la verificación y activación que solicite el proveedor.
2. En Settings → Senders, Domains, IPs → Senders, añadir el correo remitente y verificarlo con el código recibido en Gmail. No introducir la contraseña de Gmail en el proyecto.
3. Crear una clave API en Brevo. Guardarla directamente como variable secreta en Render; nunca en GitHub, capturas ni chat.
4. Añadir en Render → Environment:

| Variable | Valor |
|---|---|
| BREVO_API_KEY | Clave API privada de Brevo |
| MAIL_FROM_EMAIL | Dirección exacta del remitente verificado |
| MAIL_RECOVERY_ENABLED | 1, una vez completada la configuración |

La aplicación utiliza APP_ORIGIN HTTPS o la URL externa de Render para generar los enlaces. No agregar el APP_ORIGIN de localhost al servicio publicado. Antes de habilitar en otra instalación PostgreSQL, ejecutar supabase/03-password-recovery.sql. Para SQLite, la tabla se crea al iniciar.

Brevo puede sustituir el dominio del remitente Gmail por un dominio brevosend.com porque no se puede autenticar un dominio público como gmail.com. Esto no cambia la dirección Gmail del destinatario. Para uso institucional se recomienda un dominio de envío propio autenticado; no configurar icasys.mx sin autorización y acceso a sus DNS.

## Registrar correos reales

El administrador entra a Usuarios → Editar, cambia el correo de cada cuenta por una dirección real del titular y guarda. Se conserva el identificador del usuario y con él sus actividades, estancias y horas. Desde ese momento se inicia sesión con el nuevo correo.

Cada cuenta necesita un correo distinto. Para una demostración personal se pueden usar alias del mismo Gmail, por ejemplo nombre+asesor@gmail.com y nombre+practicante@gmail.com, siempre bajo control del residente; todos llegarán al mismo buzón. Para usuarios reales debe utilizarse el correo de cada titular. Verificar cuidadosamente la dirección antes de asignarla; la recuperación prueba acceso al buzón al utilizar el enlace, no cuando el administrador escribe la dirección.

## Probar la entrega real

1. Mantener disponible el acceso del administrador como alternativa.
2. Cerrar sesión y pulsar Olvidé mi contraseña.
3. Introducir un correo real que ya esté registrado en una cuenta activa.
4. Revisar Gmail y Spam. Abrir el enlace y elegir una contraseña nueva.
5. Confirmar que la contraseña anterior y el enlace utilizado ya no funcionan, que la nueva sí funciona y que las actividades siguen disponibles.
6. Revisar el evento password_recovered_email en Historial del sistema.

No se envía la contraseña existente ni se ingresa automáticamente después del restablecimiento. El mensaje de solicitud es el mismo para correos existentes y desconocidos; no confirma que un correo esté registrado. No considerar completada la integración hasta probar un envío y una recuperación reales.

## Funcionamiento y límites

- Tokens aleatorios de 256 bits, almacenados solo como hash SHA-256 en una tabla privada con RLS y sin acceso de roles del navegador.
- Caducidad de 20 minutos; consumo atómico, de un solo uso. Al recuperar se invalidan todos los otros enlaces y sesiones de esa cuenta.
- Cambiar correo, restablecer manualmente, cambiar contraseña o desactivar la cuenta invalida los enlaces anteriores.
- Enlace HTTPS construido con configuración confiable, no con el encabezado Host. El token viaja en el fragmento del navegador y se retira de la barra al abrir el formulario. Política Referrer-Policy no-referrer.
- Límite persistente de tres solicitudes por correo y veinte por dirección de conexión cada hora; treinta intentos de completar por dirección por hora. Detrás del proxy de Render, las conexiones pueden compartir el límite por dirección. La recuperación administrativa sigue disponible.
- Envíos en segundo plano para que su duración no revele si existe una cuenta. La cola en memoria está limitada a 64 tareas; un reinicio abrupto puede interrumpir un correo. Solicitar otro enlace más tarde si no llega. No hay reintentos automáticos ni garantía de entrega.
- Logs sin tokens, correos ni respuestas privadas del proveedor. La entrega y las restricciones de la cuenta se revisan en Brevo.
- Las contraseñas conservan el algoritmo scrypt del sistema; no se trasladaron las cuentas a Supabase Auth.

Referencias: https://developers.brevo.com/docs/send-a-transactional-email, https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email, https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication y https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html.
