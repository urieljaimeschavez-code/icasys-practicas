const {test}=require("node:test"), assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {createApplication}=require("../server.cjs"),{hashPassword}=require("../lib/database.cjs"),{verifyPassword}=require("../lib/auth.cjs");
const {createSupabaseAuth}=require("../lib/supabase-auth.cjs");
const password="MiCuentaSegura2026!", changed="OtraCuentaSegura2026!";
function fakeIdentity(){
 const users=new Map(),links=new Map(),messages=[];let count=0;
 return {ready:true,users,links,messages,
  async createUser(email,password){const id="identity-"+(++count);users.set(id,{id,email,password});return id;},
  async deleteUser(id){users.delete(id);},
  async verifyPassword(user,password){const remote=users.get(user.auth_user_id);return !!remote&&remote.email===user.email&&remote.password===password;},
  async updateUser(id,body){Object.assign(users.get(id),body);},
  async sendRecovery(email,origin){const user=[...users.values()].find(u=>u.email===email);const token=(String(messages.length+1).padStart(64,"a"));links.set(token,user.id);messages.push({email,origin,token});},
  async verifyRecovery(token){const id=links.get(token);links.delete(token);if(!id)throw Object.assign(Error("Enlace no válido"),{status:400});return {user:{...users.get(id)},access_token:"private-session"};},
  async finishRecovery(session,password){users.get(session.user.id).password=password;},
  async releaseRecovery(){},
 };
}
async function fixture(t, identity=fakeIdentity()){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"icasys-supabase-auth-"));
 const app=await createApplication({directory,bootstrap:false,driver:"sqlite",identity,recoveryOptions:{baseURL:"https://portal.example.test"}});
 for(const [id,email,role] of [["admin","admin@example.test","admin"],["student","student@example.test","student"],["legacy","asesor@icasys.local","advisor"]])app.db.prepare("INSERT INTO users(id,name,email,role,password_hash,must_change) VALUES(?,?,?,?,?,0)").run(id,id,email,role,hashPassword(password));
 await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+app.server.address().port,sessions={};
 async function request(route,user,body,method=body?"POST":"GET",extra={}){
  const session=sessions[user];const r=await fetch(base+"/api/"+route,{method,headers:{Origin:base,"Content-Type":"application/json",...(session?{Cookie:session.cookie,"X-CSRF-Token":session.csrf}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
  const b=await r.json();return {status:r.status,body:b,headers:r.headers};
 }
 function remember(id,r){if(r.headers.get("set-cookie"))sessions[id]={cookie:r.headers.get("set-cookie").split(";")[0],csrf:r.body.csrf};}
 async function login(id,pass=password,email=id+"@example.test"){const r=await request("login",null,{email,password:pass});if(r.status===200)remember(id,r);return r;}
 t.after(async()=>{await app.close();fs.rmSync(directory,{recursive:true,force:true});});
 return {app,identity,request,remember,login,sessions};
}
test("Supabase Auth: vinculación autenticada, preservación de perfil y cambio de contraseña",async t=>{
 const f=await fixture(t);
 assert.equal((await f.request("auth/link",null,{current:password})).status,401);
 await f.login("student");
 assert.equal((await f.request("auth/link","student",{current:"ClaveIncorrecta2026!"})).status,422);
 assert.equal((await f.request("auth/link","student",{current:password},"POST",{Origin:"https://otro.example.test"})).status,403);
 const old=f.sessions.student;
 const r=await f.request("auth/link","student",{current:password,role:"admin",email:"attacker@example.test"});
 assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.user.role,"student");assert.equal(r.body.user.auth_linked,true);
 f.sessions.student=old;assert.equal((await f.request("state","student")).status,401);
 f.remember("student",r);
 const row=f.app.db.prepare("SELECT * FROM users WHERE id=?").get("student");
 assert.equal(row.email,"student@example.test");assert.equal(await verifyPassword(password,row.password_hash),false);
 assert.equal((await f.login("student")).status,200);
 assert.equal((await f.request("users","student",{name:"No autorizado"})).status,403);
 const change=await f.request("password","student",{current:password,password:changed});assert.equal(change.status,200,JSON.stringify(change.body));
 assert.equal((await f.login("student",password)).status,401);assert.equal((await f.login("student",changed)).status,200);
 await f.login("legacy",password,"asesor@icasys.local");
 assert.equal((await f.request("auth/link","legacy",{current:password})).status,422);
});
test("Supabase Auth: recuperación por correo, consumo único y sesiones cerradas",async t=>{
 const f=await fixture(t);await f.login("admin");const link=await f.request("auth/link","admin",{current:password});f.remember("admin",link);
 const config=await f.request("recovery/config");assert.equal(config.body.provider,"supabase");
 const yes=await f.request("recovery/request",null,{email:"admin@example.test"});
 const no=await f.request("recovery/request",null,{email:"unknown@example.test"});assert.deepEqual(yes.body,no.body);
 for(let i=0;i<40&&!f.identity.messages.length;i++)await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(f.identity.messages.length,1);const token=f.identity.messages[0].token;
 assert.equal((await f.request("recovery/complete",null,{token,password:"corta"})).status,422);
 const recovered=await f.request("recovery/complete",null,{token,password:changed});assert.equal(recovered.status,200,JSON.stringify(recovered.body));
 assert.equal((await f.request("state","admin")).status,401);
 assert.equal((await f.request("recovery/complete",null,{token,password:changed})).status,400);
 assert.equal((await f.login("admin",password)).status,401);assert.equal((await f.login("admin",changed)).status,200);
 assert.equal(f.app.db.prepare("SELECT role FROM users WHERE id=?").get("admin").role,"admin");
 assert.ok(f.app.db.prepare("SELECT action FROM audit_log").all().some(x=>x.action==='password_recovered_supabase'));
});
test("Supabase Auth: una identidad externa sin perfil local no obtiene acceso",async t=>{
 const f=await fixture(t);const id=await f.identity.createUser("external@example.test",password);const token="f".repeat(64);f.identity.links.set(token,id);
 assert.equal((await f.request("recovery/complete",null,{token,password:changed})).status,400);
 assert.equal(f.identity.users.get(id).password,password);
 assert.equal((await f.login("external",password,"external@example.test")).status,401);
});
test("Supabase Auth: restablecimiento administrativo y cambio de correo sincronizados",async t=>{
 const f=await fixture(t);await f.login("admin");await f.login("student");const link=await f.request("auth/link","student",{current:password});f.remember("student",link);
 const reset=await f.request("users/student","admin",{name:"student",email:"newstudent@example.test",active:true,password:changed},"PUT");
 assert.equal(reset.status,200,JSON.stringify(reset.body));assert.equal((await f.request("state","student")).status,401);
 assert.equal((await f.login("student",password)).status,401);
 const login=await f.login("student",changed,"newstudent@example.test");assert.equal(login.status,200);assert.equal(login.body.user.must_change,true);
 assert.equal((await f.request("state","student")).status,403);
 assert.equal((await f.request("password","student",{current:changed,password})).status,200);
 assert.equal((await f.login("student",password,"newstudent@example.test")).status,200);
});
test("Supabase Auth: identidad vinculada no recurre a una contraseña local si el proveedor está deshabilitado",async t=>{
 const f=await fixture(t,null);f.app.db.prepare("UPDATE users SET auth_user_id=? WHERE id=?").run("external-id","admin");
 assert.equal((await f.login("admin",password)).status,503);
});
test("Cliente Supabase Auth: API privada, validación de identidad, OTP y errores seguros",async()=>{
 const calls=[];let wrong=false;
 const client=createSupabaseAuth({SUPABASE_AUTH_ENABLED:"1",SUPABASE_URL:"https://project.example.test",SUPABASE_SERVICE_ROLE_KEY:"fake-secret"},async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/token?'))return {ok:true,json:async()=>({user:{id:wrong?"other":"uid",email:"admin@example.test",user_metadata:{role:"admin"}},access_token:"private-token"})};
  if(url.endsWith('/verify'))return {ok:false,status:403,json:async()=>({code:"otp_expired",message:"PRIVATE RESPONSE"})};
  return {ok:true,json:async()=>({id:"uid"})};
 });
 const user={auth_user_id:"uid",email:"admin@example.test"};
 assert.equal(await client.verifyPassword(user,password),true);wrong=true;assert.equal(await client.verifyPassword(user,password),false);
 assert.equal(calls[0].options.headers.apikey,"fake-secret");assert.ok(calls[0].options.signal);assert.equal(calls[0].options.redirect,"error");
 await assert.rejects(client.verifyRecovery("x".repeat(64)),e=>e.status===400&&!e.message.includes('PRIVATE'));
 assert.equal(createSupabaseAuth({SUPABASE_AUTH_ENABLED:"0"}),null);
});
