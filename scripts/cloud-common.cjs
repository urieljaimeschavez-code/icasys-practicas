const fs = require("node:fs"),
  path = require("node:path");
const { openBackend } = require("../lib/backend.cjs");
const { SupabaseStorage } = require("../lib/storage.cjs");
function load() {
  try {
    process.loadEnvFile(path.join(__dirname, "..", ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (process.env.DB_DRIVER !== "postgres")
    throw Error("Configura DB_DRIVER=postgres en .env.");
}
async function connect() {
  load();
  const db = await openBackend({ driver: "postgres" });
  try {
    const storage = new SupabaseStorage();
    await storage.verifyBucket();
    return { db, storage };
  } catch (error) {
    await db.close();
    throw error;
  }
}
function reportError() {
  console.error(
    "No se completó la operación. Revisa .env, certificado TLS, conexión Session pooler y los dos archivos SQL. No compartas claves ni la URL de conexión.",
  );
  process.exitCode = 1;
}
module.exports = { load, connect, reportError, fs, path };
