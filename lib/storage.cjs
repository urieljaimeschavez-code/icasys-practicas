const { randomUUID } = require("node:crypto");
class SupabaseStorage {
  constructor({
    url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket = process.env.SUPABASE_STORAGE_BUCKET || "icasys-evidencias",
    fetcher = fetch,
  } = {}) {
    if (!url || !key)
      throw Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.");
    let origin;
    try {
      origin = new URL(url);
    } catch {
      throw Error("SUPABASE_URL no es válida.");
    }
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw Error("SUPABASE_URL debe ser el origen HTTPS del proyecto.");
    if (!/^[a-z0-9-]+$/.test(bucket))
      throw Error("Nombre de depósito no válido.");
    this.url = origin.origin;
    this.key = key;
    this.bucket = bucket;
    this.fetcher = fetcher;
  }
  headers(extra = {}) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...extra };
  }
  endpoint(key) {
    return `${this.url}/storage/v1/object/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  async request(url, options) {
    let response;
    try {
      response = await this.fetcher(url, {
        ...options,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw Object.assign(
        Error("No se pudo conectar con el almacenamiento de evidencias."),
        { status: 503 },
      );
    }
    if (!response.ok)
      throw Object.assign(
        Error(
          "Supabase rechazó la operación de evidencia. Revisa el depósito privado y las credenciales del servidor.",
        ),
        { status: 503 },
      );
    return response;
  }
  async verifyBucket() {
    const r = await this.request(
      `${this.url}/storage/v1/bucket/${this.bucket}`,
      { headers: this.headers() },
    );
    const b = await r.json();
    if (b.public !== false)
      throw Error("El depósito de evidencias debe ser privado.");
  }
  async upload(e, key = `activities/${randomUUID()}`) {
    if (!/^activities\/[a-f0-9-]{36}$/.test(key))
      throw Error("Referencia de archivo inválida.");
    await this.request(this.endpoint(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": e.mime, "x-upsert": "false" }),
      body: e.content,
    });
    return key;
  }
  async download(key) {
    if (!/^activities\/[a-f0-9-]{36}$/.test(key))
      throw Error("Referencia de archivo inválida.");
    const r = await this.request(this.endpoint(key), {
      headers: this.headers(),
    });
    return Buffer.from(await r.arrayBuffer());
  }
  // Explicit cleanup command only; normal edits retain old objects for recovery.
  async remove(key) {
    if (!/^activities\/[a-f0-9-]{36}$/.test(key))
      throw Error("Referencia de archivo inválida.");
    await this.request(`${this.url}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [key] }),
    });
  }
}
module.exports = { SupabaseStorage };
