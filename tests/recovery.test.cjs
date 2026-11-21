const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { sqliteBackend } = require("../lib/backend.cjs");
const { hashPassword } = require("../lib/database.cjs");
const { createRecovery } = require("../lib/recovery.cjs");
const { createMailer } = require("../lib/mailer.cjs");
const { digest, verifyPassword } = require("../lib/auth.cjs");
const password = "SeguraOriginal2026!", replacement = "RecuperadaSegura2026!";
async function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icasys-recovery-"));
  const db = sqliteBackend(directory, false), messages = [];
  let time = Date.now();
  await db.prepare("INSERT INTO users(id,name,email,role,password_hash,must_change) VALUES(?,?,?,?,?,0)").run("person", "Persona", "persona@example.test", "advisor", hashPassword(password));
  await db.prepare("INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)").run("previous-session", "person", "csrf", time+3600000);
  const recovery = createRecovery(db, { enabled: true, baseURL: "https://portal.example.test", now: () => time, mailer: { async sendRecovery(email, link) { messages.push({email, link}); } }, ...options });
  t.after(async () => { await recovery.drain(); await db.close(); fs.rmSync(directory, {recursive:true,force:true}); });
  return {db, recovery, messages, advance: ms => {time+=ms;}, token: i => messages[i||0].link.split("/#recuperar/")[1]};
}
test("Recuperación: respuesta uniforme, correo privado y token almacenado como hash", async t => {
  const f=await fixture(t);
  const known=f.recovery.request("persona@example.test","ip");
  const unknown=f.recovery.request("ausente@example.test","ip");
  assert.deepEqual(known,unknown);assert.deepEqual(Object.keys(known),["message"]);
  await f.recovery.drain();assert.equal(f.messages.length,1);
  assert.equal(f.messages[0].email,"persona@example.test");
  assert.match(f.messages[0].link,/^https:\/\/portal\.example\.test\/#recuperar\/[a-f0-9]{64}$/);
  const row=await f.db.prepare("SELECT * FROM password_resets").get();
  assert.equal(row.token_hash,digest(f.token()));assert.ok(!JSON.stringify(row).includes(f.token()));
  assert.equal(await verifyPassword(password,(await f.db.prepare("SELECT password_hash FROM users").get()).password_hash),true);
});
test("Recuperación: cambio, invalidación de sesiones, auditoría y uso único concurrente",async t=>{
  const f=await fixture(t);f.recovery.request("persona@example.test","ip");await f.recovery.drain();
  const results=await Promise.allSettled([f.recovery.complete(f.token(),replacement,"ip"),f.recovery.complete(f.token(),replacement,"ip")]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const user=await f.db.prepare("SELECT * FROM users").get();
  assert.equal(user.must_change,0);assert.equal(await verifyPassword(replacement,user.password_hash),true);
  assert.equal(await verifyPassword(password,user.password_hash),false);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).n,0);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM password_resets").get()).n,0);
  assert.equal((await f.db.prepare("SELECT action FROM audit_log").get()).action,"password_recovered_email");
});
test("Recuperación: rechaza token caducado, contraseña débil y cuentas desactivadas",async t=>{
  const f=await fixture(t);f.recovery.request("persona@example.test","ip");await f.recovery.drain();
  await assert.rejects(f.recovery.complete(f.token(),"corta","ip"),e=>e.status===422);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM password_resets").get()).n,1);
  f.advance(1200001);await assert.rejects(f.recovery.complete(f.token(),replacement,"ip"),e=>e.status===400);
  await f.db.prepare("UPDATE users SET active=0").run();
  f.recovery.request("persona@example.test","ip");await f.recovery.drain();assert.equal(f.messages.length,1);
});
test("Recuperación: cambiar correo o contraseña invalida enlaces previos",async t=>{
  const f=await fixture(t);f.recovery.request("persona@example.test","ip");await f.recovery.drain();
  await f.db.prepare("UPDATE users SET email=?").run("otra@example.test");
  await assert.rejects(f.recovery.complete(f.token(),replacement,"ip"),e=>e.status===400);
  await f.db.prepare("UPDATE users SET email=?,password_hash=?").run("persona@example.test",hashPassword(password));
  await assert.rejects(f.recovery.complete(f.token(),replacement,"ip"),e=>e.status===400);
});
test("Recuperación: límite persistente por cuenta sin filtrar existencia",async t=>{
  const f=await fixture(t);
  const replies=[];for(let i=0;i<4;i++)replies.push(f.recovery.request("persona@example.test","ip"));
  await f.recovery.drain();assert.equal(f.messages.length,3);assert.ok(replies.every(r=>r.message===replies[0].message));
});
test("Recuperación: no acepta origen HTTP ni funciona sin proveedor configurado",async t=>{
  const f=await fixture(t,{baseURL:"http://portal.example.test"});
  assert.equal(f.recovery.ready,false);assert.throws(()=>f.recovery.request("persona@example.test","ip"),e=>e.status===503);
  assert.equal(createRecovery(f.db,{enabled:true,baseURL:"https://portal.example.test",mailer:null}).ready,false);
});
test("Recuperación: rechaza enlace de una cuenta desactivada y elimina tokens de envíos fallidos",async t=>{
  const f=await fixture(t);f.recovery.request("persona@example.test","ip");await f.recovery.drain();
  await f.db.prepare("UPDATE users SET active=0").run();
  await assert.rejects(f.recovery.complete(f.token(),replacement,"ip"),e=>e.status===400);
  await f.db.prepare("UPDATE users SET active=1").run();
  await f.db.prepare("DELETE FROM password_resets").run();
  const failed=createRecovery(f.db,{enabled:true,baseURL:"https://portal.example.test",mailer:{async sendRecovery(){throw Error('fake failure');}}});
  failed.request("persona@example.test","different-ip");await failed.drain();
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM password_resets").get()).n,0);
});
test("Correo Brevo: solicitud HTTPS, formato, timeout y error sin respuesta privada",async()=>{
  let call;
  const mail=createMailer({BREVO_API_KEY:"fake-test-key",MAIL_FROM_EMAIL:"remitente@example.test"},async(url,opts)=>{call={url,opts};return {ok:true};});
  await mail.sendRecovery("persona@example.test","https://portal.example.test/#recuperar/token");
  assert.equal(call.url,"https://api.brevo.com/v3/smtp/email");assert.equal(call.opts.headers['api-key'],"fake-test-key");
  assert.equal(JSON.parse(call.opts.body).to[0].email,"persona@example.test");assert.ok(call.opts.signal);
  const rejected=createMailer({BREVO_API_KEY:"fake",MAIL_FROM_EMAIL:"sender@example.test"},async()=>({ok:false}));
  await assert.rejects(rejected.sendRecovery("persona@example.test","link"),e=>e.code==='MAIL_DELIVERY_FAILED');
});
