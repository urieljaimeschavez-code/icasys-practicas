const v = require("./validation.cjs");
function createSupabaseAuth(env = process.env, request = fetch) {
  if (env.SUPABASE_AUTH_ENABLED !== "1") return null;
  let root;
  try { root = new URL(env.SUPABASE_URL); } catch { throw Error("Falta configurar Supabase Auth."); }
  if (root.protocol !== "https:" || !env.SUPABASE_SERVICE_ROLE_KEY) throw Error("Falta configurar Supabase Auth.");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  async function call(route, method, body, token = key) {
    let response;
    try {
      response = await request(root.origin + "/auth/v1/" + route, {
        method, redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { v.fail("No se pudo conectar con Supabase Auth. Intenta más tarde.", 503); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const invalid = result.code === "invalid_credentials" || result.error_code === "invalid_credentials";
      if (invalid) return null;
      if (route === "verify" || route === "token?grant_type=pkce") v.fail("El enlace no es válido, ya se usó o ha caducado. Solicita otro y ábrelo en el mismo navegador.", 400);
      if (route === "admin/users" && [400,409,422].includes(response.status)) v.fail("No se pudo crear la identidad. Puede que el correo ya exista en Supabase Auth; solicita apoyo técnico antes de volver a vincularlo.", 409);
      v.fail("Supabase Auth no pudo completar la operación. Revisa su configuración o intenta más tarde.", 503);
    }
    return result;
  }
  async function revoke(accessToken, scope = "local") {
    if (accessToken) await call("logout?scope=" + scope, "POST", null, accessToken).catch(() => {});
  }
  return {
    ready: true,
    async verifyPassword(user, password) {
      const result = await call("token?grant_type=password", "POST", {email:user.email,password});
      if (!result) return false;
      try { return result.user?.id === user.auth_user_id && result.user?.email?.toLowerCase() === user.email; }
      finally { await revoke(result.access_token); }
    },
    async createUser(email, password) {
      // Migración de una cuenta interna autenticada: no hay registro público ni roles en metadata.
      const result = await call("admin/users", "POST", {email,password,email_confirm:true});
      if (!result?.id) v.fail("Supabase Auth no devolvió una identidad válida.",503);
      return result.id;
    },
    deleteUser: uid => call("admin/users/" + encodeURIComponent(uid), "DELETE"),
    updateUser: (uid, body) => call("admin/users/" + encodeURIComponent(uid), "PUT", body),
    sendRecovery: (email, origin, challenge) => call("recover?redirect_to=" + encodeURIComponent(origin + "/"), "POST", {email,...(challenge?{code_challenge:challenge,code_challenge_method:"s256"}:{})}),
    exchangeRecovery: (code, verifier) => call("token?grant_type=pkce", "POST", {auth_code:code,code_verifier:verifier}),
    verifyRecovery: token => call("verify", "POST", {type:"recovery",token_hash:token}),
    async finishRecovery(session, password) {
      try { await call("user", "PUT", {password}, session.access_token); }
      finally { await revoke(session.access_token, "global"); }
    },
    releaseRecovery: session => revoke(session?.access_token),
  };
}
module.exports = { createSupabaseAuth };
