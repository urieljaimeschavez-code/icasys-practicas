const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {sqliteBackend}=require('../lib/backend.cjs');
const {dataset,seedDemo}=require('../scripts/demo-data.cjs');
const main={id:'p1',student_id:'student',advisor_id:'advisor',start:'2026-09-01',end:'2026-12-18'};
test('Datos demo: fechas, horas, estados y estancia histórica coherentes',()=>{
 const plan=dataset(main);assert.equal(plan.activities.length,42);
 const approved=plan.activities.filter(a=>a.placement_id===main.id&&a.status==='approved');
 assert.equal(approved.reduce((s,a)=>s+a.hours,0),132);
 assert.equal(plan.activities.filter(a=>a.placement_id===plan.historic.id).reduce((s,a)=>s+a.hours,0),90);
 assert.equal(plan.historic.target,90);
 assert.deepEqual([...new Set(plan.activities.map(a=>a.status))].sort(),['approved','correction','draft','pending']);
 for(const a of plan.activities){const p=a.placement_id===main.id?main:plan.historic;assert.ok(a.date>=p.start&&a.date<=p.end);assert.ok(a.hours>=0.5&&a.hours<=12&&a.hours*2%1===0);assert.match(a.title,/\[Demo\]/);assert.match(a.description,/no acredita/);}
});
test('Datos demo: carga repetible conserva cuentas, originales y cambios posteriores',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'icasys-demo-')),db=sqliteBackend(directory,false);
 t.after(async()=>{await db.close();fs.rmSync(directory,{recursive:true,force:true});});
 for(const [id,role] of [['admin','admin'],['advisor','advisor'],['student','student']])await db.prepare('INSERT INTO users(id,name,email,role,password_hash) VALUES(?,?,?,?,?)').run(id,id,id+'@example.test',role,'hash-local-de-prueba');
 await db.prepare('INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)').run(main.id,main.student_id,main.advisor_id,'Escuela original','Proyecto original',main.start,main.end,480);
 await db.prepare('INSERT INTO activities(id,placement_id,title,description,date,hours,status) VALUES(?,?,?,?,?,?,?)').run('original',main.id,'Registro original','Actividad previa que no debe cambiar.','2026-10-01',2,'approved');
 const accounts=await db.prepare('SELECT * FROM users ORDER BY id').all(),original=await db.prepare('SELECT * FROM activities WHERE id=?').get('original');
 let snapshots=0;const result=await seedDemo(db,null,{beforeWrite:async()=>{snapshots++;}});
 assert.deepEqual(result,{inserted:42,evidence:24,placement:1});assert.equal(snapshots,1);
 assert.deepEqual(await db.prepare('SELECT * FROM users ORDER BY id').all(),accounts);assert.deepEqual(await db.prepare('SELECT * FROM activities WHERE id=?').get('original'),original);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM reviews').get()).n,36);
 const edited=dataset(main).activities[0];await db.prepare('UPDATE activities SET title=? WHERE id=?').run('Cambio posterior del usuario',edited.id);
 assert.deepEqual(await seedDemo(db,null,{beforeWrite:async()=>{snapshots++;}}),{inserted:0,evidence:0,placement:0});assert.equal(snapshots,1);
 assert.equal((await db.prepare('SELECT title FROM activities WHERE id=?').get(edited.id)).title,'Cambio posterior del usuario');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM activities').get()).n,43);
 const evidence=await db.prepare('SELECT content,size FROM evidence LIMIT 1').get();assert.equal(evidence.content.length,evidence.size);assert.match(Buffer.from(evidence.content).toString('utf8'),/Este archivo es ficticio/);
});
