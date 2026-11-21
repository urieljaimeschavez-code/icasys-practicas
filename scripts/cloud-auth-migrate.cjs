const fs = require("node:fs"), path = require("node:path");
const { Pool } = require("pg");
const { poolConfiguration } = require("../lib/backend.cjs");
(async () => {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
  const pool = new Pool(poolConfiguration());
  try {
    await pool.query(fs.readFileSync(path.join(__dirname,"../supabase/04-auth-link.sql"),"utf8"));
    console.log("Referencia de identidad preparada. No se crearon usuarios Auth ni se cambiaron contraseñas.");
  } finally { await pool.end(); }
})().catch(() => { console.error("No se completó la migración Auth. Revisa la conexión; no se muestran credenciales."); process.exitCode=1; });
