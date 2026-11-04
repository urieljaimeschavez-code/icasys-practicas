const { DatabaseSync } = require("node:sqlite");
const { createHash, randomUUID } = require("node:crypto");
const { connect, reportError, fs, path } = require("./cloud-common.cjs");
(async () => {
  const file = path.resolve(
    process.env.SQLITE_IMPORT_FILE ||
      path.join(__dirname, "..", "data", "icasys.sqlite"),
  );
  if (!fs.existsSync(file)) throw Error("No existe la base local de origen.");
  const local = new DatabaseSync(file, { readOnly: true }),
    { db, storage } = await connect();
  try {
    if (await db.prepare("SELECT id FROM users LIMIT 1").get())
      throw Error("La base de destino debe estar vacía. No se modificó.");
    const sources = {};
    for (const table of [
      "users",
      "placements",
      "activities",
      "reviews",
      "evidence",
    ])
      sources[table] = local.prepare(`SELECT * FROM ${table}`).all();
    const uploaded = [];
    for (const e of sources.evidence) {
      const content = Buffer.from(e.content);
      if (createHash("sha256").update(content).digest("hex") !== e.sha256)
        throw Error("Evidencia local inconsistente.");
      const key = `activities/${randomUUID()}`;
      await db
        .prepare("INSERT INTO storage_uploads(storage_key) VALUES(?)")
        .run(key);
      await storage.upload({ mime: e.mime, content }, key);
      uploaded.push({ ...e, storage_key: key });
    }
    await db.transaction(async () => {
      await db.prepare("LOCK TABLE users IN EXCLUSIVE MODE").run();
      if (await db.prepare("SELECT id FROM users LIMIT 1").get())
        throw Error("El destino dejó de estar vacío.");
      const definitions = {
        users: [
          "id",
          "name",
          "email",
          "role",
          "password_hash",
          "active",
          "must_change",
          "created_at",
        ],
        placements: [
          "id",
          "student_id",
          "advisor_id",
          "school",
          "project",
          "start",
          "end",
          "target",
          "version",
          "created_at",
        ],
        activities: [
          "id",
          "placement_id",
          "title",
          "description",
          "date",
          "hours",
          "status",
          "version",
          "created_at",
          "updated_at",
        ],
        reviews: [
          "id",
          "activity_id",
          "reviewer_id",
          "decision",
          "comment",
          "created_at",
        ],
      };
      for (const [table, columns] of Object.entries(definitions))
        for (const row of sources[table])
          await db
            .prepare(
              `INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`,
            )
            .run(...columns.map((c) => row[c]));
      for (const e of uploaded) {
        await db
          .prepare(
            "INSERT INTO evidence(activity_id,name,mime,storage_key,size,sha256) VALUES(?,?,?,?,?,?)",
          )
          .run(e.activity_id, e.name, e.mime, e.storage_key, e.size, e.sha256);
        await db
          .prepare("DELETE FROM storage_uploads WHERE storage_key=?")
          .run(e.storage_key);
      }
      await db
        .prepare("INSERT INTO audit_log(action) VALUES(?)")
        .run("sqlite_import_completed");
    });
    console.log(
      "Importación terminada. Usuarios, estancias, actividades, revisiones y evidencias conservados.",
    );
    console.log(
      "Las contraseñas existentes se conservan. No se copiaron sesiones ni intentos de ingreso; el historial operativo anterior permanece en la copia SQLite.",
    );
  } finally {
    local.close();
    await db.close();
  }
})().catch(reportError);
