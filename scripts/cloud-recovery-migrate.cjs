// Solo agrega la tabla privada de tokens. No modifica cuentas ni contraseñas.
const fs = require("node:fs"), path = require("node:path");
const { Pool } = require("pg");
const { poolConfiguration } = require("../lib/backend.cjs");
(async () => {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
  const pool = new Pool(poolConfiguration());
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, "../supabase/03-password-recovery.sql"), "utf8"));
    console.log("Migración de recuperación aplicada. Se conservaron usuarios, contraseñas y actividades.");
  } finally { await pool.end(); }
})().catch(() => {
  console.error("No se aplicó la migración de recuperación. Revisa la conexión PostgreSQL; no se muestran credenciales.");
  process.exitCode = 1;
});
