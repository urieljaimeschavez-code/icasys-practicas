const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createApplication}=require('../server.cjs');
const {hashPassword,openDatabase}=require('../lib/database.cjs');
const {backup}=require('node:sqlite');

test('Sistema de prácticas: autenticación, permisos, flujo y persistencia',async t=>{
 const directory=path.join(__dirname,'tmp-'+Date.now()),app=await createApplication({directory,bootstrap:false,driver:'sqlite'});
 const insert=app.db.prepare('INSERT INTO users(id,name,email,role,password_hash,must_change) VALUES(?,?,?,?,?,?)');
 const password='PruebaSegura2026!';
 for(const [id,role,change] of [['student','student',0],['other','student',0],['advisor','advisor',0],['outsider','advisor',0],['admin','admin',0],['temporary','student',1]])insert.run(id,id,`${id}@example.test`,role,hashPassword(password),change);
 for(const [id,student,advisor] of [['p1','student','advisor'],['p2','other','outsider']])app.db.prepare('INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)').run(id,student,advisor,'Universidad','Proyecto','2026-01-01','2027-12-31',480);
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${app.server.address().port}`,sessions={};
 async function request(route,{user,method='GET',body,csrf=true,origin=base}={}){
  const session=sessions[user],headers={Origin:origin,'Content-Type':'application/json'};
  if(session){headers.Cookie=session.cookie;if(csrf)headers['X-CSRF-Token']=session.csrf}
  const r=await fetch(base+'/api/'+route,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const content=r.headers.get('content-type')||'';return {status:r.status,body:content.includes('application/json')?await r.json():await r.text(),headers:r.headers};
 }
 async function login(user,pass=password){const r=await request('login',{method:'POST',body:{email:`${user}@example.test`,password:pass}});if(r.status===200)sessions[user]={cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.body.csrf};return r}
 let activity;
 try{
  await t.test('No hay acceso anónimo ni descarga de archivos internos',async()=>{
   assert.equal((await request('state')).status,401);
   for(const file of ['/data/icasys.sqlite','/data/accesos-iniciales.txt','/server.cjs','/respaldo-maqueta/app.js'])assert.equal((await fetch(base+file)).status,404);
   assert.equal((await login('student','incorrecta')).status,401);
   const r=await login('student');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
   for(const u of ['other','advisor','outsider','admin','temporary'])assert.equal((await login(u)).status,200);
  });
  await t.test('Contraseña temporal obligatoria y rotación de sesión',async()=>{
   assert.equal((await request('state',{user:'temporary'})).status,403);
   const old=sessions.temporary.cookie;
   const r=await request('password',{user:'temporary',method:'POST',body:{current:password,password:'NuevaSegura2026!'}});assert.equal(r.status,200);
   sessions.temporary={cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.body.csrf};assert.notEqual(sessions.temporary.cookie,old);
   assert.equal((await request('state',{user:'temporary'})).status,200);
   const raw=app.db.prepare('SELECT password_hash FROM users WHERE id=?').get('temporary');assert.ok(!raw.password_hash.includes('NuevaSegura2026!'));
  });
  await t.test('Datos filtrados por asignación y protección CSRF',async()=>{
   const s=await request('state',{user:'student'});assert.deepEqual(s.body.placements.map(x=>x.id),['p1']);assert.equal(s.body.users.length,0);
   const a=await request('state',{user:'advisor'});assert.deepEqual(a.body.placements.map(x=>x.id),['p1']);
   assert.equal((await request('users',{user:'student',method:'POST',body:{}})).status,403);
   assert.equal((await request('activities',{user:'student',method:'POST',body:{},csrf:false})).status,403);
   assert.equal((await request('activities',{user:'student',method:'POST',body:{},origin:'https://externo.test'})).status,403);
   assert.equal((await request('activities',{user:'student',method:'POST',body:{placement:'p2'}})).status,403);
  });
  const record={placement:'p1',title:'Implementación del módulo',description:'Construcción y verificación de las funciones del módulo de prácticas.',date:'2026-10-01',hours:4,status:'pending',evidence:{name:'evidencia.txt',url:'data:text/plain;base64,'+Buffer.from('Evidencia de prueba').toString('base64')}};
  await t.test('Validaciones del servidor y almacenamiento de evidencia',async()=>{
   for(const change of [{hours:-1},{hours:13},{hours:1.25},{date:'2026-02-30'},{date:'2099-01-01'},{description:'corta'},{status:'approved'},{evidence:{name:'falso.pdf',url:'data:application/pdf;base64,'+Buffer.from('no es PDF').toString('base64')}}])assert.equal((await request('activities',{user:'student',method:'POST',body:{...record,...change}})).status,422);
   const r=await request('activities',{user:'student',method:'POST',body:record});assert.equal(r.status,201);activity=r.body.id;
   assert.equal((await request('evidence/'+activity,{user:'student'})).body,'Evidencia de prueba');
   assert.equal((await request('evidence/'+activity,{user:'other'})).status,403);
   assert.equal((await request('evidence/'+activity,{user:'outsider'})).status,403);
   assert.equal((await request('activities',{user:'student',method:'POST',body:{...record,hours:9}})).status,422);
  });
  await t.test('Corrección, reenvío, aprobación e impedimento de doble revisión',async()=>{
   const route='activities/'+activity+'/review';
   assert.equal((await request(route,{user:'student',method:'POST',body:{status:'approved',version:1}})).status,403);
   assert.equal((await request(route,{user:'outsider',method:'POST',body:{status:'approved',version:1}})).status,403);
   assert.equal((await request(route,{user:'advisor',method:'POST',body:{status:'correction',comment:'corto',version:1}})).status,422);
   assert.equal((await request(route,{user:'advisor',method:'POST',body:{status:'correction',comment:'Agrega más detalle de los resultados.',version:1}})).status,200);
   assert.equal((await request('activities/'+activity,{user:'student',method:'PUT',body:{...record,version:1}})).status,409);
   assert.equal((await request('activities/'+activity,{user:'student',method:'PUT',body:{...record,description:'Descripción corregida con resultados y evidencia del trabajo.',version:2}})).status,200);
   assert.equal((await request(route,{user:'advisor',method:'POST',body:{status:'approved',comment:'Trabajo revisado.',version:3}})).status,200);
   assert.equal((await request(route,{user:'advisor',method:'POST',body:{status:'approved',version:3}})).status,409);
   assert.equal((await request('activities/'+activity,{user:'student',method:'PUT',body:{...record,version:4}})).status,409);
   const a=(await request('state',{user:'student'})).body.activities.find(a=>a.id===activity);assert.equal(a.status,'approved');assert.equal(a.history.length,2);
  });
  await t.test('Dos revisiones simultáneas producen una sola decisión',async()=>{
   const r=await request('activities',{user:'student',method:'POST',body:{...record,date:'2026-10-03'}});assert.equal(r.status,201);
   const responses=await Promise.all([1,2].map(()=>request('activities/'+r.body.id+'/review',{user:'advisor',method:'POST',body:{status:'approved',version:1}})));
   assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
   assert.equal(app.db.prepare('SELECT COUNT(*) total FROM reviews WHERE activity_id=?').get(r.body.id).total,1);
  });
  await t.test('Borradores privados y auditoría restringida',async()=>{
   const r=await request('activities',{user:'student',method:'POST',body:{...record,date:'2026-10-02',status:'draft'}});assert.equal(r.status,201);
   assert.ok(!(await request('state',{user:'advisor'})).body.activities.some(a=>a.id===r.body.id));
   assert.equal((await request('evidence/'+r.body.id,{user:'advisor'})).status,403);
   assert.equal((await request('audit',{user:'student'})).status,403);const log=await request('audit',{user:'admin'});assert.ok(log.body.some(e=>e.action==='activity_approved'));
  });
  await t.test('Gestión de cuentas y revocación al desactivar',async()=>{
   const r=await request('users',{user:'admin',method:'POST',body:{name:'Nuevo practicante',email:'nuevo@example.test',role:'student',password}});assert.equal(r.status,201);
   assert.equal((await request('users',{user:'admin',method:'POST',body:{name:'Duplicado',email:'nuevo@example.test',role:'student',password}})).status,409);
   const p=await request('placements',{user:'admin',method:'POST',body:{student_id:r.body.id,advisor_id:'advisor',school:'Escuela',project:'Proyecto nuevo',start:'2026-09-01',end:'2026-12-31',target:480}});assert.equal(p.status,201);
   assert.equal((await request('placements',{user:'student',method:'POST',body:{}})).status,403);
   assert.equal((await request('users/admin',{user:'admin',method:'PUT',body:{name:'admin',email:'admin@example.test',active:false}})).status,422);
   assert.equal((await request('users/other',{user:'admin',method:'PUT',body:{name:'other',email:'other@example.test',active:false}})).status,200);
   assert.equal((await request('state',{user:'other'})).status,401);
  });
  await t.test('Respaldo íntegro con archivos, datos y contraseñas protegidas',async()=>{
   const target=path.join(directory,'backup.sqlite');await backup(app.db,target);const {DatabaseSync}=require('node:sqlite'),copy=new DatabaseSync(target);
   assert.equal(copy.prepare('SELECT status FROM activities WHERE id=?').get(activity).status,'approved');assert.equal(copy.prepare('SELECT size FROM evidence WHERE activity_id=?').get(activity).size,Buffer.byteLength('Evidencia de prueba'));copy.close();
  });
  await t.test('Cerrar sesión invalida la cookie anterior',async()=>{assert.equal((await request('logout',{user:'student',method:'POST'})).status,200);assert.equal((await request('state',{user:'student'})).status,401)});
  await t.test('Bloqueo de intentos fallidos',async()=>{for(let i=0;i<10;i++)assert.equal((await login('outsider','incorrecta')).status,401);assert.equal((await login('outsider','incorrecta')).status,429)});
 }finally{await app.close()}
 await t.test('Persistencia tras reabrir SQLite',()=>{const db=openDatabase(directory,false);assert.equal(db.prepare('SELECT status FROM activities WHERE id=?').get(activity).status,'approved');assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close()});
});
