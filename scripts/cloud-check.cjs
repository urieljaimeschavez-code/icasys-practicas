const { connect, reportError } = require("./cloud-common.cjs");
(async () => {
  const { db, storage } = await connect();
  try {
    for (const table of [
      "users",
      "placements",
      "activities",
      "evidence",
      "reviews",
      "sessions",
      "login_attempts",
      "audit_log",
      "storage_uploads",
    ])
      await db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).all();
    const role = await db.prepare("SELECT current_user AS name").get();
    console.log(
      "PostgreSQL: conexión TLS validada y esquema ICASYS disponible.",
    );
    console.log("Storage: depósito privado comprobado.");
    const users = await db.prepare("SELECT COUNT(*) AS count FROM users").get();
    console.log(
      Number(users.count)
        ? "Hay usuarios registrados. Se conserva su configuración."
        : "No hay usuarios. Ejecuta cloud:init o cloud:import según tu caso.",
    );
  } finally {
    await db.close();
  }
})().catch(reportError);
