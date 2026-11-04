const {
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const digest = (token) => createHash("sha256").update(token).digest("hex");
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const result = await derive(password, salt, 64);
  return timingSafeEqual(result, Buffer.from(hash, "hex"));
}
async function session(db, req) {
  const token = req.headers.cookie?.match(
    /(?:^|;\s*)icasys_session=([a-f0-9]{64})(?:;|$)/,
  )?.[1];
  if (!token) return null;
  return (
    (await db
      .prepare(
        `SELECT u.id,u.name,u.email,u.role,u.must_change,s.csrf,s.token_hash FROM sessions s
    JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`,
      )
      .get(digest(token), Date.now())) || null
  );
}
async function createSession(db, user, res, secure) {
  const token = randomBytes(32).toString("hex"),
    csrf = randomBytes(32).toString("hex");
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  await db
    .prepare(
      "INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)",
    )
    .run(digest(token), user.id, csrf, Date.now() + 8 * 3600 * 1000);
  res.setHeader(
    "Set-Cookie",
    `icasys_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? "; Secure" : ""}`,
  );
  return csrf;
}
module.exports = {
  verifyPassword,
  session,
  createSession,
  digest,
};
