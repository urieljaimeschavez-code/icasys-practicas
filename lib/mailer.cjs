// API HTTPS: compatible con Render sin depender de puertos SMTP.
function createMailer(env = process.env, request = fetch) {
  if (!env.BREVO_API_KEY || !env.MAIL_FROM_EMAIL) return null;
  const sender = { email: env.MAIL_FROM_EMAIL, name: "ICASYS · Prácticas profesionales" };
  return {
    async sendRecovery(email, link) {
      const response = await request("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender, to: [{ email }], subject: "Restablece tu contraseña de ICASYS",
          textContent: `Se solicitó restablecer la contraseña de tu cuenta en el portal de prácticas profesionales.\n\nAbre este enlace para elegir una contraseña nueva:\n${link}\n\nEl enlace caduca en 20 minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este mensaje. Tu contraseña no ha cambiado.\n\nProyecto de residencia · Sistema independiente de evaluación.`,
        }),
      });
      // No registrar el cuerpo: puede contener direcciones, claves o enlaces.
      if (!response.ok) throw Object.assign(new Error("El proveedor rechazó el envío."), { code: "MAIL_DELIVERY_FAILED" });
    },
  };
}
module.exports = { createMailer };
