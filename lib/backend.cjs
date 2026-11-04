const { AsyncLocalStorage } = require("node:async_hooks");
const fs = require("node:fs");
const { openDatabase } = require("./database.cjs");

// Serializes SQLite operations outside a transaction, while allowing its own
// asynchronous transaction callback to reuse the same connection safely.
function sqliteBackend(directory, bootstrap) {
  const raw = openDatabase(directory, bootstrap),
    context = new AsyncLocalStorage();
  let tail = Promise.resolve();
  function exclusive(work) {
    if (context.getStore()) return Promise.resolve().then(work);
    const pending = tail.then(() => context.run(true, work));
    tail = pending.catch(() => {});
    return pending;
  }
  return {
    driver: "sqlite",
    raw,
    prepare(sql) {
      return Object.fromEntries(
        ["get", "all", "run"].map((method) => [
          method,
          (...values) => exclusive(() => raw.prepare(sql)[method](...values)),
        ]),
      );
    },
    transaction(work) {
      return exclusive(async () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          const result = await work();
          raw.exec("COMMIT");
          return result;
        } catch (error) {
          raw.exec("ROLLBACK");
          throw error;
        }
      });
    },
    lockPlacement: async () => {},
    close: async () => {
      await tail;
      raw.close();
    },
  };
}

// The application uses ? placeholders for both drivers. Only executable SQL
// characters are converted, not quoted question marks or identifiers.
function postgresSql(sql) {
  let index = 0,
    quote = null,
    out = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      out += c;
      if (c === quote) {
        if (sql[i + 1] === quote) {
          out += sql[++i];
        } else quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      out += c;
    } else if (/[A-Za-z_]/.test(c)) {
      const word = sql.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
      out += word === "end" ? '"end"' : word;
      i += word.length - 1;
    } else out += c === "?" ? "$" + ++index : c;
  }
  return out
    .replace(/\br\.rowid\b/g, "r.id")
    .replace(
      /updated_at=CURRENT_TIMESTAMP/g,
      "updated_at=to_char(CURRENT_TIMESTAMP,'YYYY-MM-DD HH24:MI:SS.US')",
    );
}
function poolConfiguration(env = process.env) {
  if (!env.DATABASE_URL)
    throw Error("Falta DATABASE_URL. Configura .env antes de usar PostgreSQL.");
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw Error("DATABASE_URL no tiene un formato válido.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("DATABASE_URL debe ser una conexión PostgreSQL.");
  // TLS is verified. URL sslmode must not override the explicit SSL settings.
  for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(name);
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(env.PG_CA_FILE
        ? { ca: fs.readFileSync(env.PG_CA_FILE, "utf8") }
        : {}),
    },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    options: "-c search_path=icasys,pg_catalog -c timezone=UTC",
    application_name: "icasys-practicas",
  };
}
function postgresBackend(pool) {
  const context = new AsyncLocalStorage();
  const query = (sql, values = []) =>
    (context.getStore() || pool).query(postgresSql(sql), values);
  return {
    driver: "postgres",
    raw: pool,
    prepare(sql) {
      return {
        async get(...values) {
          return (await query(sql, values)).rows[0];
        },
        async all(...values) {
          return (await query(sql, values)).rows;
        },
        async run(...values) {
          const result = await query(sql, values);
          return { changes: result.rowCount };
        },
      };
    },
    async transaction(work) {
      if (context.getStore())
        throw Error("No se permiten transacciones anidadas.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await context.run(client, work);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async lockPlacement(key) {
      if (!context.getStore())
        throw Error("El bloqueo requiere una transacción.");
      await query("SELECT id FROM placements WHERE id=? FOR UPDATE", [key]);
    },
    close: () => pool.end(),
  };
}
async function openBackend({
  directory,
  bootstrap,
  driver = process.env.DB_DRIVER || "sqlite",
  pool,
} = {}) {
  if (driver === "sqlite") return sqliteBackend(directory, bootstrap);
  if (driver !== "postgres")
    throw Error("DB_DRIVER debe ser sqlite o postgres.");
  const { Pool } = require("pg");
  const connectionPool = pool || new Pool(poolConfiguration());
  if (!pool)
    connectionPool.on("error", () =>
      console.error(
        "La conexión PostgreSQL se interrumpió. Revisa el estado del proyecto Supabase.",
      ),
    );
  const db = postgresBackend(connectionPool);
  try {
    await db.prepare("SELECT id FROM users LIMIT 1").all();
  } catch (error) {
    await db.close();
    throw Error(
      "No se pudo abrir PostgreSQL. Revisa conexión TLS, credenciales y ejecución de supabase/01-schema.sql.",
    );
  }
  // Cloud installs are initialized explicitly with scripts/cloud-init.cjs.
  return db;
}
module.exports = {
  openBackend,
  sqliteBackend,
  postgresBackend,
  postgresSql,
  poolConfiguration,
};
