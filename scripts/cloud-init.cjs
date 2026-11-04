const { randomBytes } = require("node:crypto");
const { hashPassword } = require("../lib/database.cjs");
const { connect, reportError, fs, path } = require("./cloud-common.cjs");
(async () => {
  const { db } = await connect();
  const credentials = [];
  try {
    await db.transaction(async () => {
      // Prevent two initialization commands from seeding the same installation.
      await db.prepare("LOCK TABLE users IN EXCLUSIVE MODE").run();
      if (await db.prepare("SELECT id FROM users LIMIT 1").get())
        throw Error("La base ya tiene usuarios. No se modificó.");
      for (const [id, name, email, role] of [
        ["u-admin", "Coordinación ICASYS", "admin@icasys.local", "admin"],
        ["u-advisor", "Laura Martínez", "asesor@icasys.local", "advisor"],
        ["u-student", "Uriel", "practicante@icasys.local", "student"],
      ]) {
        const password = randomBytes(12).toString("base64url") + "aA9!";
        await db
          .prepare(
            "INSERT INTO users(id,name,email,role,password_hash) VALUES(?,?,?,?,?)",
          )
          .run(id, name, email, role, hashPassword(password));
        credentials.push(`${role}: ${email}\nContraseña temporal: ${password}`);
      }
      await db
        .prepare(
          "INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          "p1",
          "u-student",
          "u-advisor",
          "Institución por confirmar",
          "Módulo de prácticas profesionales",
          "2026-09-01",
          "2026-12-18",
          480,
        );
      const dir = path.join(__dirname, "..", "data");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "accesos-nube.txt"),
        "Accesos iniciales de la instalación en Supabase\n\n" +
          credentials.join("\n\n") +
          "\n\nCambia personalmente cada contraseña al ingresar.\n",
        { flag: "wx", mode: 0o600 },
      );
    });
    console.log(
      "Cuentas iniciales creadas. Consulta data/accesos-nube.txt de forma privada.",
    );
  } finally {
    await db.close();
  }
})().catch(reportError);
