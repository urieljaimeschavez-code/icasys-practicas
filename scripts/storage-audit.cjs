const { connect, reportError } = require("./cloud-common.cjs");
(async () => {
  const { db } = await connect();
  try {
    const rows = await db
      .prepare(
        "SELECT s.storage_key,s.created_at FROM storage_uploads s LEFT JOIN evidence e ON e.storage_key=s.storage_key WHERE e.activity_id IS NULL ORDER BY s.created_at",
      )
      .all();
    console.log("Cargas sin referencia confirmada:", rows.length);
    console.log(
      "Este comando no borra archivos. Revisa el diario storage_uploads en SQL Editor antes de cualquier limpieza.",
    );
  } finally {
    await db.close();
  }
})().catch(reportError);
