const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const { createHash } = require("node:crypto");
const { hashPassword, id } = require("./lib/database.cjs");
const { openBackend } = require("./lib/backend.cjs");
const { SupabaseStorage } = require("./lib/storage.cjs");
const transaction = (db, work) => db.transaction(work);
const auth = require("./lib/auth.cjs"),
  v = require("./lib/validation.cjs");
async function createApplication({
  directory = process.env.DATA_DIR || path.join(__dirname, "data"),
  bootstrap = true,
  secure = process.env.COOKIE_SECURE === "1",
  driver = process.env.DB_DRIVER || "sqlite",
  pool,
  storage: providedStorage,
} = {}) {
  const db = await openBackend({
    directory,
    bootstrap,
    driver,
    pool,
  });
  let storage;
  try {
    storage =
      providedStorage ||
      (db.driver === "postgres" ? new SupabaseStorage() : null);
    if (storage) await storage.verifyBucket();
  } catch (error) {
    await db.close();
    throw error;
  }
  const audit = async (user, action, entity = null) =>
    await db
      .prepare("INSERT INTO audit_log(user_id,action,entity_id) VALUES(?,?,?)")
      .run(user?.id || null, action, entity);
  const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    must_change: !!u.must_change,
  });
  async function getPlacement(key) {
    if (typeof key !== "string" || !key)
      v.fail("Selecciona una estancia válida.");
    const p = await db.prepare("SELECT * FROM placements WHERE id=?").get(key);
    if (!p) v.fail("Estancia no encontrada.", 404);
    return p;
  }
  function access(user, p) {
    if (
      user.role !== "admin" &&
      !(user.role === "student" && p.student_id === user.id) &&
      !(user.role === "advisor" && p.advisor_id === user.id)
    )
      v.fail("No tienes acceso a esta estancia.", 403);
  }
  async function state(user) {
    const where =
      user.role === "admin"
        ? "1=1"
        : user.role === "student"
          ? "p.student_id=?"
          : "p.advisor_id=?";
    const placements = await db
        .prepare(
          `SELECT p.*,s.name,a.name advisor FROM placements p JOIN users s ON s.id=p.student_id JOIN users a ON a.id=p.advisor_id WHERE ${where} ORDER BY p.created_at,p.id`,
        )
        .all(...(user.role === "admin" ? [] : [user.id])),
      activities = [];
    for (const p of placements)
      for (const a of await db
        .prepare(
          "SELECT * FROM activities WHERE placement_id=? ORDER BY created_at,id",
        )
        .all(p.id)) {
        if (user.role === "advisor" && a.status === "draft") continue;
        const evidence = await db
          .prepare("SELECT name FROM evidence WHERE activity_id=?")
          .get(a.id);
        const history = (
          await db
            .prepare(
              "SELECT r.*,u.name FROM reviews r JOIN users u ON r.reviewer_id=u.id WHERE activity_id=? ORDER BY r.created_at,r.rowid",
            )
            .all(a.id)
        ).map((r) => ({
          date: r.created_at.slice(0, 10),
          text: `${r.name}: ${r.comment}`,
          decision: r.decision,
        }));
        activities.push({
          ...a,
          placement: a.placement_id,
          evidence: evidence
            ? {
                name: evidence.name,
                url: `/api/evidence/${a.id}`,
              }
            : null,
          history,
        });
      }
    const users =
      user.role === "admin"
        ? (
            await db
              .prepare(
                "SELECT id,name,email,role,active,must_change FROM users ORDER BY name",
              )
              .all()
          ).map(publicUser)
        : [];
    return {
      user: publicUser(user),
      placements,
      activities,
      users,
    };
  }
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      v.fail("Usa contenido JSON.", 415);
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 3 * 1024 * 1024) v.fail("La solicitud excede 3 MB.", 413);
      chunks.push(chunk);
    }
    try {
      const b = JSON.parse(Buffer.concat(chunks).toString());
      if (!b || typeof b !== "object" || Array.isArray(b)) throw Error();
      return b;
    } catch {
      v.fail("El contenido JSON no es válido.", 400);
    }
  }
  function evidenceInput(e) {
    const name = v
      .text(e?.name, "Nombre de evidencia", 1, 180)
      .replace(/[\/\\\r\n\x00-\x1f]/g, "_");
    const match =
      typeof e.url === "string" &&
      e.url.match(/^data:([\w.+/-]*);base64,([A-Za-z0-9+/]*={0,2})$/);
    if (!match) v.fail("El archivo no es válido.");
    const content = Buffer.from(match[2], "base64");
    if (!content.length || content.length > 2097152)
      v.fail("La evidencia debe tener entre 1 byte y 2 MB.");
    const ext = path.extname(name).toLowerCase();
    let mime;
    if (ext === ".pdf" && content.subarray(0, 5).toString() === "%PDF-")
      mime = "application/pdf";
    if (
      ext === ".png" &&
      content
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    if (
      [".jpg", ".jpeg"].includes(ext) &&
      content[0] === 255 &&
      content[1] === 216 &&
      content[2] === 255
    )
      mime = "image/jpeg";
    if (
      ext === ".txt" &&
      !content.includes(0) &&
      !content.toString("utf8").includes("\uFFFD")
    )
      mime = "text/plain";
    if (!mime)
      v.fail("El contenido no coincide con un PDF, PNG, JPG o TXT permitido.");
    return {
      name,
      mime,
      content,
      size: content.length,
      sha: createHash("sha256").update(content).digest("hex"),
    };
  }
  async function storeEvidence(key, e) {
    if (storage) {
      await db
        .prepare(
          "INSERT INTO evidence(activity_id,name,mime,storage_key,size,sha256) VALUES(?,?,?,?,?,?) ON CONFLICT(activity_id) DO UPDATE SET name=excluded.name,mime=excluded.mime,storage_key=excluded.storage_key,size=excluded.size,sha256=excluded.sha256",
        )
        .run(key, e.name, e.mime, e.storage_key, e.size, e.sha);
      await db
        .prepare("DELETE FROM storage_uploads WHERE storage_key=?")
        .run(e.storage_key);
      return;
    }
    await db
      .prepare(
        "INSERT INTO evidence(activity_id,name,mime,content,size,sha256) VALUES(?,?,?,?,?,?) ON CONFLICT(activity_id) DO UPDATE SET name=excluded.name,mime=excluded.mime,content=excluded.content,size=excluded.size,sha256=excluded.sha256",
      )
      .run(key, e.name, e.mime, e.content, e.size, e.sha);
  }
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    try {
      const route = new URL(req.url, "http://localhost").pathname,
        method = req.method;
      if (!route.startsWith("/api/")) {
        if (method !== "GET" && method !== "HEAD")
          v.fail("Método no permitido.", 405);
        const files = {
          "/": "index.html",
          "/index.html": "index.html",
          "/styles.css": "styles.css",
          "/app.js": "app.js",
          "/assets/logo-blanco.png": "assets/logo-blanco.png",
          "/documentacion": "docs/DOCUMENTACION.html",
        };
        if (!files[route]) v.fail("No encontrado.", 404);
        const types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".png": "image/png",
          },
          file = path.join(__dirname, files[route]);
        res.writeHead(200, {
          "Content-Type": types[path.extname(file)],
        });
        return res.end(method === "HEAD" ? undefined : fs.readFileSync(file));
      }
      if (!["GET", "POST", "PUT"].includes(method))
        v.fail("Método no permitido.", 405);
      if (method !== "GET") {
        const origin = req.headers.origin;
        if (
          !origin ||
          !["http:", "https:"].includes(new URL(origin).protocol) ||
          (process.env.APP_ORIGIN
            ? origin !== new URL(process.env.APP_ORIGIN).origin
            : new URL(origin).host !== req.headers.host)
        )
          v.fail("Origen de solicitud no permitido.", 403);
      }
      if (route === "/api/login" && method === "POST") {
        const b = await body(req),
          email = v.email(b.email),
          password = typeof b.password === "string" ? b.password : "";
        if (password.length > 128) v.fail("Credenciales incorrectas.", 401);
        const keys = [
          auth.digest(`ip:${req.socket.remoteAddress}`),
          auth.digest(`account:${email}`),
        ];
        for (const key of keys) {
          const a = await db
            .prepare("SELECT * FROM login_attempts WHERE key=?")
            .get(key);
          if (a && a.reset_at > Date.now() && a.failures >= 10)
            v.fail("Demasiados intentos. Espera 15 minutos.", 429);
        }
        const u = await db
            .prepare("SELECT * FROM users WHERE email=?")
            .get(email),
          valid = await auth.verifyPassword(
            password,
            u?.password_hash || hashPassword("invalid-placeholder-password"),
          );
        const latest = u
          ? await db
              .prepare("SELECT password_hash,active FROM users WHERE id=?")
              .get(u.id)
          : null;
        if (
          !u ||
          !u.active ||
          !valid ||
          !latest?.active ||
          latest.password_hash !== u.password_hash
        ) {
          for (const key of keys)
            await db
              .prepare(
                `INSERT INTO login_attempts(key,failures,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN reset_at<? THEN 1 ELSE failures+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END`,
              )
              .run(key, Date.now() + 900000, Date.now(), Date.now());
          v.fail("Correo o contraseña incorrectos.", 401);
        }
        for (const key of keys)
          await db.prepare("DELETE FROM login_attempts WHERE key=?").run(key);
        const csrf = await auth.createSession(db, u, res, secure);
        await audit(u, "login");
        return json(200, {
          user: publicUser(u),
          csrf,
        });
      }
      const user = await auth.session(db, req);
      if (!user) v.fail("Inicia sesión para continuar.", 401);
      if (method !== "GET" && req.headers["x-csrf-token"] !== user.csrf)
        v.fail("La sesión de seguridad no es válida. Recarga la página.", 403);
      if (route === "/api/session" && method === "GET")
        return json(200, {
          user: publicUser(user),
          csrf: user.csrf,
        });
      if (route === "/api/logout" && method === "POST") {
        await db
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .run(user.token_hash);
        res.setHeader(
          "Set-Cookie",
          "icasys_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        await audit(user, "logout");
        return json(200, {
          ok: true,
        });
      }
      if (route === "/api/password" && method === "POST") {
        const b = await body(req),
          password = v.password(b.password),
          stored = await db
            .prepare("SELECT password_hash FROM users WHERE id=?")
            .get(user.id);
        if (
          !(await auth.verifyPassword(
            String(b.current || "").slice(0, 128),
            stored.password_hash,
          ))
        )
          v.fail("La contraseña actual no es correcta.");
        if (await auth.verifyPassword(password, stored.password_hash))
          v.fail("Elige una contraseña distinta de la actual.");
        await transaction(db, async () => {
          await db
            .prepare(
              "UPDATE users SET password_hash=?,must_change=0 WHERE id=?",
            )
            .run(hashPassword(password), user.id);
          await db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
          await audit(user, "password_changed");
        });
        const csrf = await auth.createSession(db, user, res, secure);
        return json(200, {
          csrf,
        });
      }
      if (user.must_change)
        v.fail("Cambia tu contraseña temporal para continuar.", 403);
      if (route === "/api/state" && method === "GET")
        return json(200, await state(user));
      if (route === "/api/users" && method === "POST") {
        if (user.role !== "admin")
          v.fail("Solo el administrador puede gestionar usuarios.", 403);
        const b = await body(req),
          name = v.text(b.name, "Nombre"),
          email = v.email(b.email);
        if (!["student", "advisor", "admin"].includes(b.role))
          v.fail("Perfil no válido.");
        const password = v.password(b.password),
          key = id();
        if (await db.prepare("SELECT id FROM users WHERE email=?").get(email))
          v.fail("Ya existe un usuario con ese correo.", 409);
        await transaction(db, async () => {
          await db
            .prepare(
              "INSERT INTO users(id,name,email,role,password_hash) VALUES(?,?,?,?,?)",
            )
            .run(key, name, email, b.role, hashPassword(password));
          await audit(user, "user_created", key);
        });
        return json(201, {
          id: key,
        });
      }
      if (route.startsWith("/api/users/") && method === "PUT") {
        if (user.role !== "admin") v.fail("Acceso denegado.", 403);
        const key = route.split("/")[3],
          target = await db.prepare("SELECT * FROM users WHERE id=?").get(key);
        if (!target) v.fail("Usuario no encontrado.", 404);
        const b = await body(req),
          name = v.text(b.name, "Nombre"),
          email = v.email(b.email);
        if (typeof b.active !== "boolean") v.fail("Estado no válido.");
        if (key === user.id && !b.active)
          v.fail("No puedes desactivar tu propia cuenta.");
        if (
          await db
            .prepare("SELECT id FROM users WHERE email=? AND id<>?")
            .get(email, key)
        )
          v.fail("El correo ya está registrado.", 409);
        const password = b.password ? v.password(b.password) : null;
        await transaction(db, async () => {
          await db
            .prepare("UPDATE users SET name=?,email=?,active=? WHERE id=?")
            .run(name, email, b.active ? 1 : 0, key);
          if (password)
            await db
              .prepare(
                "UPDATE users SET password_hash=?,must_change=1 WHERE id=?",
              )
              .run(hashPassword(password), key);
          if (password || !b.active)
            await db.prepare("DELETE FROM sessions WHERE user_id=?").run(key);
          await audit(
            user,
            password ? "user_password_reset" : "user_updated",
            key,
          );
        });
        return json(200, {
          ok: true,
        });
      }
      if (route === "/api/audit" && method === "GET") {
        if (user.role !== "admin") v.fail("Acceso denegado.", 403);
        return json(
          200,
          await db
            .prepare(
              "SELECT l.*,u.name FROM audit_log l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 200",
            )
            .all(),
        );
      }
      if (
        (route === "/api/placements" && method === "POST") ||
        (route.startsWith("/api/placements/") && method === "PUT")
      ) {
        if (user.role !== "admin")
          v.fail("Solo el administrador gestiona estancias.", 403);
        const b = await body(req),
          old =
            method === "PUT" ? await getPlacement(route.split("/")[3]) : null;
        if (old && b.version !== old.version)
          v.fail("La estancia cambió. Recarga antes de editar.", 409);
        const student = await db
            .prepare(
              "SELECT id FROM users WHERE id=? AND role='student' AND active=1",
            )
            .get(b.student_id || ""),
          advisor = await db
            .prepare(
              "SELECT id FROM users WHERE id=? AND role='advisor' AND active=1",
            )
            .get(b.advisor_id || "");
        if (!student || !advisor)
          v.fail("Selecciona un practicante y un asesor activos.");
        if (
          old &&
          old.student_id !== student.id &&
          (await db
            .prepare("SELECT id FROM activities WHERE placement_id=? LIMIT 1")
            .get(old.id))
        )
          v.fail(
            "No puedes cambiar el titular de una estancia con actividades.",
          );
        const school = v.text(b.school, "Institución"),
          project = v.text(b.project, "Proyecto"),
          start = v.date(b.start),
          end = v.date(b.end),
          target = v.number(b.target, 1, 2000, "Horas requeridas");
        if (end < start) v.fail("La fecha final debe ser posterior al inicio.");
        if (
          old &&
          (await db
            .prepare(
              "SELECT id FROM activities WHERE placement_id=? AND (date<? OR date>?) LIMIT 1",
            )
            .get(old.id, start, end))
        )
          v.fail("El periodo debe incluir las actividades existentes.");
        const key = old?.id || id();
        await transaction(db, async () => {
          if (old) {
            await db.lockPlacement(key);
            const live = await getPlacement(key);
            if (live.version !== b.version)
              v.fail("La estancia cambió. Actualiza los datos.", 409);
            if (
              live.student_id !== student.id &&
              (await db
                .prepare(
                  "SELECT id FROM activities WHERE placement_id=? LIMIT 1",
                )
                .get(key))
            )
              v.fail(
                "No puedes cambiar el titular de una estancia con actividades.",
              );
            if (
              await db
                .prepare(
                  "SELECT id FROM activities WHERE placement_id=? AND (date<? OR date>?) LIMIT 1",
                )
                .get(key, start, end)
            )
              v.fail("El periodo debe incluir las actividades existentes.");
            await db
              .prepare(
                "UPDATE placements SET student_id=?,advisor_id=?,school=?,project=?,start=?,end=?,target=?,version=version+1 WHERE id=?",
              )
              .run(
                student.id,
                advisor.id,
                school,
                project,
                start,
                end,
                target,
                key,
              );
          } else
            await db
              .prepare(
                "INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)",
              )
              .run(
                key,
                student.id,
                advisor.id,
                school,
                project,
                start,
                end,
                target,
              );
          await audit(
            user,
            old ? "placement_updated" : "placement_created",
            key,
          );
        });
        return json(old ? 200 : 201, {
          id: key,
        });
      }
      if (
        (route === "/api/activities" && method === "POST") ||
        (/^\/api\/activities\/[^/]+$/.test(route) && method === "PUT")
      ) {
        if (user.role !== "student")
          v.fail("Solo el practicante registra actividades.", 403);
        const b = await body(req),
          old =
            method === "PUT"
              ? await db
                  .prepare("SELECT * FROM activities WHERE id=?")
                  .get(route.split("/")[3])
              : null;
        if (method === "PUT" && !old) v.fail("Actividad no encontrada.", 404);
        const p = await getPlacement(old?.placement_id || b.placement);
        access(user, p);
        if (old && !["draft", "correction"].includes(old.status))
          v.fail(
            "Solo puedes editar borradores o actividades con corrección.",
            409,
          );
        if (old && old.version !== b.version)
          v.fail("La actividad cambió. Recarga antes de editar.", 409);
        const title = v.text(b.title, "Título", 1, 120),
          description = v.text(b.description, "Descripción", 15, 3000),
          date = v.date(b.date),
          hours = v.number(b.hours, 0.5, 12, "Horas");
        if (date < p.start || date > p.end || date > v.today())
          v.fail("La fecha debe estar dentro de la estancia y no ser futura.");
        if (!["draft", "pending"].includes(b.status))
          v.fail("No puedes asignar ese estado.");
        if (b.status === "pending") {
          const sum = (
            await db
              .prepare(
                "SELECT COALESCE(SUM(hours),0) hours FROM activities WHERE placement_id=? AND date=? AND status<>'draft' AND id<>?",
              )
              .get(p.id, date, old?.id || "")
          ).hours;
          if (Number(sum) + hours > 12)
            v.fail(
              "El total diario de actividades enviadas no puede superar 12 horas.",
            );
        }
        let evidence = null;
        if (b.evidence && b.evidence.url?.startsWith("data:"))
          evidence = evidenceInput(b.evidence);
        else if (
          b.evidence &&
          (!old || b.evidence.url !== `/api/evidence/${old.id}`)
        )
          v.fail("Referencia de evidencia no válida.");
        const key = old?.id || id();
        if (evidence && storage) {
          // Journal first, upload second: failed SQL commits leave a recoverable,
          // private object. No successful submission is reported before commit.
          const objectKey = `activities/${id()}`;
          await db
            .prepare("INSERT INTO storage_uploads(storage_key) VALUES(?)")
            .run(objectKey);
          evidence.storage_key = await storage.upload(evidence, objectKey);
        }
        await transaction(db, async () => {
          await db.lockPlacement(p.id);
          const livePlacement = await getPlacement(p.id);
          access(user, livePlacement);
          if (date < livePlacement.start || date > livePlacement.end)
            v.fail("La estancia cambió. Revisa el periodo.", 409);
          if (old) {
            const live = await db
              .prepare("SELECT * FROM activities WHERE id=?")
              .get(key);
            if (
              live.version !== b.version ||
              !["draft", "correction"].includes(live.status)
            )
              v.fail("La actividad cambió. Actualiza los datos.", 409);
          }
          if (b.status === "pending") {
            const daily = await db
              .prepare(
                "SELECT COALESCE(SUM(hours),0) hours FROM activities WHERE placement_id=? AND date=? AND status<>'draft' AND id<>?",
              )
              .get(p.id, date, old?.id || "");
            if (Number(daily.hours) + hours > 12)
              v.fail("El total diario no puede superar 12 horas.");
          }
          if (old)
            await db
              .prepare(
                "UPDATE activities SET title=?,description=?,date=?,hours=?,status=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",
              )
              .run(title, description, date, hours, b.status, key);
          else
            await db
              .prepare(
                "INSERT INTO activities(id,placement_id,title,description,date,hours,status) VALUES(?,?,?,?,?,?,?)",
              )
              .run(key, p.id, title, description, date, hours, b.status);
          if (evidence) await storeEvidence(key, evidence);
          await audit(
            user,
            b.status === "draft" ? "activity_draft" : "activity_submitted",
            key,
          );
        });
        return json(old ? 200 : 201, {
          id: key,
        });
      }
      if (
        /^\/api\/activities\/[^/]+\/review$/.test(route) &&
        method === "POST"
      ) {
        if (user.role !== "advisor")
          v.fail("Solo el asesor asignado puede revisar.", 403);
        const a = await db
          .prepare("SELECT * FROM activities WHERE id=?")
          .get(route.split("/")[3]);
        if (!a) v.fail("Actividad no encontrada.", 404);
        const p = await getPlacement(a.placement_id);
        access(user, p);
        const b = await body(req);
        if (a.status !== "pending" || b.version !== a.version)
          v.fail(
            "La actividad ya fue revisada o modificada. Recarga la página.",
            409,
          );
        if (!["approved", "correction"].includes(b.status))
          v.fail("Decisión no válida.");
        const comment =
          b.status === "correction"
            ? v.text(b.comment, "Corrección", 10, 1500)
            : v.text(
                b.comment || "Actividad y horas aprobadas.",
                "Comentario",
                1,
                1500,
              );
        await transaction(db, async () => {
          await db.lockPlacement(p.id);
          access(user, await getPlacement(p.id));
          const changed = await db
            .prepare(
              "UPDATE activities SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND status='pending'",
            )
            .run(b.status, a.id, b.version);
          if (changed.changes !== 1)
            v.fail(
              "La actividad ya fue revisada o modificada. Recarga la página.",
              409,
            );
          await db
            .prepare(
              "INSERT INTO reviews(id,activity_id,reviewer_id,decision,comment) VALUES(?,?,?,?,?)",
            )
            .run(id(), a.id, user.id, b.status, comment);
          await audit(user, `activity_${b.status}`, a.id);
        });
        return json(200, {
          ok: true,
        });
      }
      if (route.startsWith("/api/evidence/") && method === "GET") {
        const key = route.split("/")[3],
          a = await db.prepare("SELECT * FROM activities WHERE id=?").get(key);
        if (!a) v.fail("Evidencia no encontrada.", 404);
        access(user, await getPlacement(a.placement_id));
        if (user.role === "advisor" && a.status === "draft")
          v.fail("Acceso denegado.", 403);
        const e = await db
          .prepare("SELECT * FROM evidence WHERE activity_id=?")
          .get(key);
        if (!e) v.fail("Evidencia no encontrada.", 404);
        const content = storage
          ? await storage.download(e.storage_key)
          : Buffer.from(e.content);
        if (createHash("sha256").update(content).digest("hex") !== e.sha256)
          throw Object.assign(
            Error("La evidencia no coincide con su huella guardada."),
            { status: 503 },
          );
        res.writeHead(200, {
          "Content-Type": e.mime,
          "Content-Disposition": `attachment; filename="evidencia${path.extname(e.name)}"; filename*=UTF-8''${encodeURIComponent(e.name)}`,
        });
        return res.end(content);
      }
      v.fail("Ruta no encontrada.", 404);
    } catch (error) {
      if (res.headersSent) return res.end();
      if (!error.status)
        console.error(
          "Error interno de servidor. Código:",
          error.code || "sin_codigo",
        );
      json(error.status || 500, {
        error: error.status
          ? error.message
          : "Ocurrió un error interno. Intenta de nuevo.",
      });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return {
    server,
    db: db.raw,
    backend: db,
    close: () =>
      new Promise((resolve) =>
        server.close(async () => {
          await db.close();
          resolve();
        }),
      ),
  };
}
async function main() {
  try {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Render proporciona la URL HTTPS del servicio al iniciar el contenedor.
  if (!process.env.APP_ORIGIN && process.env.RENDER === "true")
    process.env.APP_ORIGIN = process.env.RENDER_EXTERNAL_URL;
  if (
    process.env.HOST === "0.0.0.0" &&
    (!process.env.APP_ORIGIN?.startsWith("https://") ||
      process.env.COOKIE_SECURE !== "1")
  )
    throw Error("La publicación requiere APP_ORIGIN HTTPS y COOKIE_SECURE=1.");
  const app = await createApplication(),
    port = Number(process.env.PORT || 4173);
  app.server.on("error", (e) => {
    console.error(
      e.code === "EADDRINUSE"
        ? `El puerto ${port} ya está en uso. Cierra el servidor anterior antes de iniciar esta versión.`
        : e.message,
    );
    process.exitCode = 1;
    app.backend.close().catch(() => {});
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      app
        .close()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  app.server.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      `ICASYS · Puerto ${port}\nMotor: ${app.backend.driver}\n${app.backend.driver === "sqlite" ? "Datos locales en la carpeta data." : "Conexión PostgreSQL configurada. Las credenciales no se muestran."}`,
    ),
  );
}
if (require.main === module)
  main().catch(() => {
    console.error(
      "No se pudo iniciar. Revisa la configuración y ejecuta el diagnóstico npm run cloud:check si usas Supabase.",
    );
    process.exitCode = 1;
  });
module.exports = {
  createApplication,
};
