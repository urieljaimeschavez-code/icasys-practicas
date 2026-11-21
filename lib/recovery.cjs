const { randomBytes } = require("node:crypto");
const { digest } = require("./auth.cjs");
const { hashPassword } = require("./database.cjs");
const v = require("./validation.cjs");
const { createMailer } = require("./mailer.cjs");
const MESSAGE = "Si el correo corresponde a una cuenta activa, recibirás un enlace de recuperación. Revisa también Spam. Si no llega, espera unos minutos o solicita apoyo al administrador.";
function createRecovery(db, {
  enabled = process.env.MAIL_RECOVERY_ENABLED === "1",
  baseURL = process.env.APP_ORIGIN,
  mailer = createMailer(),
  identity = null,
  now = Date.now,
} = {}) {
  let origin;
  try { const url = new URL(baseURL); if (url.protocol === "https:" && !url.username && !url.password) origin = url.origin; } catch {}
  const ready = Boolean(origin && (identity?.ready || (enabled && mailer))), jobs = new Set();
  async function allow(key, limit) {
    const time = now();
    const row = await db.prepare(`INSERT INTO login_attempts(key,failures,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN login_attempts.reset_at<=? THEN 1 ELSE login_attempts.failures+1 END,reset_at=CASE WHEN login_attempts.reset_at<=? THEN excluded.reset_at ELSE login_attempts.reset_at END RETURNING failures`).get(key, time + 3600000, time, time);
    return row.failures <= limit;
  }
  async function dispatch(email, ip) {
    if (!await allow(digest(`recovery-ip:${ip}`), 20)) return;
    if (!await allow(digest(`recovery-account:${email}`), 3)) return;
    const user = await db.prepare("SELECT id,email,password_hash,auth_user_id FROM users WHERE email=? AND active=1").get(email);
    if (!user || /\.local$/i.test(email)) return;
    if (identity) {
      if (user.auth_user_id) await identity.sendRecovery(user.email, origin);
      return;
    }
    if (user.auth_user_id) return;
    const token = randomBytes(32).toString("hex"), tokenHash = digest(token);
    await db.prepare("DELETE FROM password_resets WHERE expires_at<=?").run(now());
    await db.prepare("INSERT INTO password_resets(token_hash,user_id,email,password_digest,expires_at) VALUES(?,?,?,?,?)").run(tokenHash, user.id, user.email, digest(user.password_hash), now() + 1200000);
    try {
      await mailer.sendRecovery(user.email, `${origin}/#recuperar/${token}`);
    } catch (error) {
      await db.prepare("DELETE FROM password_resets WHERE token_hash=?").run(tokenHash);
      throw error;
    }
  }
  return {
    ready,
    provider: identity ? "supabase" : "local",
    request(email, ip) {
      if (!ready) v.fail("La recuperación por correo todavía no está habilitada. Solicita apoyo al administrador.", 503);
      email = v.email(email);
      // La misma respuesta inmediata para cuentas existentes, ausentes o limitadas.
      // La cola está acotada y no revela si el envío tuvo un destinatario real.
      if (jobs.size < 64) {
        const job = new Promise(resolve => setImmediate(resolve)).then(() => dispatch(email, ip)).catch(() => {
          console.error("No se pudo procesar un correo de recuperación. Revisa el proveedor de correo, Auth y las migraciones; no se muestran datos privados.");
        });
        jobs.add(job); job.finally(() => jobs.delete(job));
      }
      return { message: MESSAGE };
    },
    async complete(token, password, ip) {
      if (!ready) v.fail("La recuperación por correo todavía no está habilitada.", 503);
      if (!await allow(digest(`recovery-complete:${ip}`), 30)) v.fail("Demasiados intentos. Intenta más tarde.", 429);
      if (typeof token !== "string" || !(identity ? /^[a-zA-Z0-9_-]{32,512}$/ : /^[a-f0-9]{64}$/).test(token)) v.fail("El enlace no es válido o ha caducado.", 400);
      password = v.password(password);
      if (identity) {
        // Supabase verifica y consume una sola vez el token_hash de recuperación.
        const session = await identity.verifyRecovery(token);
        try {
          if (!session?.user?.id || !session.access_token) v.fail("El enlace no es válido o ha caducado.",400);
          await db.transaction(async () => {
            const candidate = await db.prepare("SELECT id FROM users WHERE auth_user_id=? AND active=1").get(session.user.id);
            if (!candidate) v.fail("No hay una cuenta activa vinculada a este enlace.",400);
            await db.lockUser(candidate.id);
            const user = await db.prepare("SELECT * FROM users WHERE id=? AND active=1").get(candidate.id);
            if (!user || user.auth_user_id !== session.user.id || user.email !== session.user.email?.toLowerCase()) v.fail("La cuenta vinculada ya no es válida.",400);
            await identity.finishRecovery(session, password);
            await db.prepare("UPDATE users SET password_hash=?,must_change=0 WHERE id=?").run(hashPassword(randomBytes(32).toString("hex")),user.id);
            await db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
            await db.prepare("DELETE FROM password_resets WHERE user_id=?").run(user.id);
            await db.prepare("DELETE FROM login_attempts WHERE key=?").run(digest(`account:${user.email}`));
            await db.prepare("INSERT INTO audit_log(user_id,action,entity_id) VALUES(?,?,?)").run(user.id,"password_recovered_supabase",user.id);
          });
        } finally { await identity.releaseRecovery(session); }
        return {message:"Contraseña actualizada. Inicia sesión con tu nueva contraseña."};
      }
      const passwordHash = hashPassword(password);
      await db.transaction(async () => {
        // DELETE RETURNING reclama el token de forma atómica, incluso con dos peticiones simultáneas.
        const reset = await db.prepare("DELETE FROM password_resets WHERE token_hash=? AND expires_at>? RETURNING user_id,email,password_digest").get(digest(token), now());
        if (!reset) v.fail("El enlace no es válido o ha caducado.", 400);
        const user = await db.prepare("SELECT id,email,password_hash,active,auth_user_id FROM users WHERE id=?").get(reset.user_id);
        if (!user || !user.active || user.auth_user_id || user.email !== reset.email || digest(user.password_hash) !== reset.password_digest) v.fail("El enlace no es válido o ha caducado.", 400);
        const changed = await db.prepare("UPDATE users SET password_hash=?,must_change=0 WHERE id=? AND password_hash=? AND email=? AND active=1").run(passwordHash, user.id, user.password_hash, user.email);
        if (changed.changes !== 1) v.fail("El enlace ya no es válido. Solicita uno nuevo.", 400);
        await db.prepare("DELETE FROM password_resets WHERE user_id=?").run(user.id);
        await db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        await db.prepare("DELETE FROM login_attempts WHERE key=?").run(digest(`account:${user.email}`));
        await db.prepare("INSERT INTO audit_log(user_id,action,entity_id) VALUES(?,?,?)").run(user.id, "password_recovered_email", user.id);
      });
      return { message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." };
    },
    drain: () => Promise.allSettled([...jobs]),
  };
}
module.exports = { createRecovery };
