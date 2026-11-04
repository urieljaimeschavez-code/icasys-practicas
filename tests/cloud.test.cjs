const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  postgresBackend,
  postgresSql,
  poolConfiguration,
} = require("../lib/backend.cjs");
const { SupabaseStorage } = require("../lib/storage.cjs");
const { newDb, DataType } = require("pg-mem");
const fs = require("node:fs"),
  path = require("node:path");

test("PostgreSQL: parámetros y TLS con verificación de certificado", () => {
  assert.equal(
    postgresSql("SELECT '?' AS literal, end FROM placements WHERE id=?"),
    "SELECT '?' AS literal, \"end\" FROM placements WHERE id=$1",
  );
  assert.equal(
    postgresSql("SELECT 'end' AS text, end FROM placements"),
    "SELECT 'end' AS text, \"end\" FROM placements",
  );
  const c = poolConfiguration({
    DATABASE_URL: "postgresql://test:example@localhost/db?sslmode=require",
  });
  assert.equal(c.ssl.rejectUnauthorized, true);
  assert.ok(!c.connectionString.includes("sslmode="));
  assert.match(c.options, /search_path=icasys/);
  assert.throws(() => poolConfiguration({}), /DATABASE_URL/);
});

test("PostgreSQL: consultas, transacción vinculada a un único cliente y liberación", async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push(["client", sql, values]);
      return { rows: [{ id: "ok" }], rowCount: 1 };
    },
    release() {
      calls.push(["release"]);
    },
  };
  const pool = {
    async query(sql, values) {
      calls.push(["pool", sql, values]);
      return { rows: [{ id: "ok" }], rowCount: 1 };
    },
    async connect() {
      return client;
    },
    async end() {},
  };
  const db = postgresBackend(pool);
  assert.deepEqual(
    await db.prepare("SELECT id FROM users WHERE id=?").get("ok"),
    { id: "ok" },
  );
  await db.transaction(async () => {
    await db.lockPlacement("p1");
    const r = await db
      .prepare("UPDATE users SET name=? WHERE id=?")
      .run("Nombre", "ok");
    assert.equal(r.changes, 1);
  });
  assert.equal(calls.filter((c) => c[0] === "pool").length, 1);
  assert.ok(calls.some((c) => c[1] === "COMMIT"));
  assert.equal(calls.at(-1)[0], "release");
  await assert.rejects(
    db.transaction(async () => {
      throw Error("fallo");
    }),
    /fallo/,
  );
  assert.ok(calls.some((c) => c[1] === "ROLLBACK"));
});

test("Storage privado: rechazo de depósito público, subida sin sobrescritura y descarga", async () => {
  const requests = [];
  const storage = new SupabaseStorage({
    url: "https://example.supabase.co",
    key: "test-only-key",
    fetcher: async (url, options) => {
      requests.push({ url, options });
      if (url.includes("/bucket/")) return Response.json({ public: false });
      if (options.method === "POST") return Response.json({ Key: "ok" });
      return new Response("archivo");
    },
  });
  await storage.verifyBucket();
  const e = { content: Buffer.from("archivo"), mime: "text/plain" };
  const key = await storage.upload(e);
  assert.match(key, /^activities\/[a-f0-9-]+$/);
  assert.equal(requests[1].options.headers["x-upsert"], "false");
  assert.equal((await storage.download(key)).toString(), "archivo");
  assert.ok(!requests.some((r) => r.url.includes("/public/")));
  const publicStore = new SupabaseStorage({
    url: "https://example.supabase.co",
    key: "test-only",
    fetcher: async () => Response.json({ public: true }),
  });
  await assert.rejects(publicStore.verifyBucket(), /privado/);
  await assert.rejects(storage.download("../otra-carpeta"), /inválida/);
});

test("Contrato SQL de la aplicación sobre emulación PostgreSQL y Storage privado", async () => {
  const memory = newDb();
  memory.public.registerFunction({
    name: "floor",
    args: [DataType.float],
    returns: DataType.float,
    implementation: Math.floor,
  });
  memory.public.registerFunction({
    name: "to_char",
    args: [DataType.timestamp, DataType.text],
    returns: DataType.text,
    implementation: (d) =>
      new Date(d).toISOString().replace("T", " ").slice(0, 23),
  });
  memory.public.registerFunction({
    name: "timezone",
    args: [DataType.text, DataType.timestamp],
    returns: DataType.timestamp,
    implementation: (_, d) => d,
  });
  let sql = fs.readFileSync(
    path.join(__dirname, "../supabase/01-schema.sql"),
    "utf8",
  );
  sql = sql
    .replace(/^--.*$/gm, "")
    .replace(/\bBEGIN;|\bCOMMIT;/g, "")
    .replace(
      /^(?:CREATE SCHEMA|REVOKE|SET LOCAL|ALTER TABLE|ALTER DEFAULT PRIVILEGES)[\s\S]*?;/gm,
      "",
    );
  // pg-mem does not implement RLS, TLS, row locks or transaction isolation.
  // It only verifies SQL/data/API compatibility; live checks remain required.
  sql = sql.replace(
    /CURRENT_TIMESTAMP AT TIME ZONE 'UTC'/g,
    "CURRENT_TIMESTAMP",
  );
  memory.public.none(sql);
  const { Pool } = memory.adapters.createPg(),
    pool = new Pool();
  const { hashPassword } = require("../lib/database.cjs"),
    password = "CuentaPrueba2026!";
  for (const [id, role] of [
    ["student", "student"],
    ["advisor", "advisor"],
    ["admin", "admin"],
    ["other", "student"],
  ])
    await pool.query(
      "INSERT INTO users(id,name,email,role,password_hash,must_change) VALUES($1,$2,$3,$4,$5,0)",
      [id, id, id + "@example.test", role, hashPassword(password)],
    );
  await pool.query(
    'INSERT INTO placements(id,student_id,advisor_id,school,project,start,"end",target) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      "p1",
      "student",
      "advisor",
      "Escuela",
      "Proyecto",
      "2026-01-01",
      "2027-12-31",
      480,
    ],
  );
  const objects = new Map(),
    storage = {
      async verifyBucket() {},
      async upload(e, key) {
        objects.set(key, e.content);
        return key;
      },
      async download(key) {
        return objects.get(key);
      },
    };
  const { createApplication } = require("../server.cjs"),
    app = await createApplication({ driver: "postgres", pool, storage });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`,
    sessions = {};
  async function req(route, user, body, method = body ? "POST" : "GET") {
    const s = sessions[user];
    const r = await fetch(base + "/api/" + route, {
      method,
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(s ? { Cookie: s.cookie, "X-CSRF-Token": s.csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const b = (r.headers.get("content-type") || "").includes("application/json")
      ? await r.json()
      : await r.text();
    return { r, b };
  }
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { r, b } = await req("login", "student", {
        email: "student@example.test",
        password: "incorrecta",
      });
      assert.equal(r.status, 401, JSON.stringify(b));
      const counters = await pool.query("SELECT failures FROM login_attempts");
      assert.equal(counters.rows.length, 2);
      assert.ok(counters.rows.every((row) => row.failures === attempt));
    }
    for (const u of ["student", "advisor", "other"]) {
      const { r, b } = await req("login", u, {
        email: u + "@example.test",
        password,
      });
      assert.equal(r.status, 200, JSON.stringify(b));
      sessions[u] = {
        cookie: r.headers.get("set-cookie").split(";")[0],
        csrf: b.csrf,
      };
    }
    const record = {
      placement: "p1",
      title: "Actividad en PostgreSQL",
      description: "Validación del contrato de persistencia y archivo privado.",
      date: "2026-10-01",
      hours: 2,
      status: "pending",
      evidence: {
        name: "prueba.txt",
        url:
          "data:text/plain;base64," +
          Buffer.from("archivo privado").toString("base64"),
      },
    };
    const { r, b } = await req("activities", "student", record);
    assert.equal(r.status, 201, JSON.stringify(b));
    const key = b.id;
    assert.equal(
      (await req("evidence/" + key, "student")).b,
      "archivo privado",
    );
    assert.equal((await req("evidence/" + key, "other")).r.status, 403);
    const review = await req("activities/" + key + "/review", "advisor", {
      status: "approved",
      version: 1,
    });
    assert.equal(review.r.status, 200, JSON.stringify(review.b));
    const state = await req("state", "student");
    assert.equal(state.r.status, 200, JSON.stringify(state.b));
    assert.equal(state.b.activities[0].status, "approved");
    assert.equal(state.b.activities[0].history.length, 1);
    assert.equal(state.b.placements[0].name, "student");
    assert.equal(
      (await pool.query("SELECT * FROM evidence")).rows[0].content,
      undefined,
    );
    assert.equal(objects.size, 1);
  } finally {
    await app.close();
  }
});
