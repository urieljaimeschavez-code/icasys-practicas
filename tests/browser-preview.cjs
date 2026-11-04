// Isolated UI verification; never touches data/icasys.sqlite.
const path=require('node:path');
const {createApplication}=require('../server.cjs');
const {hashPassword}=require('../lib/database.cjs');
(async()=>{
const app=await createApplication({directory:path.join(__dirname,'tmp-browser'),bootstrap:false,driver:'sqlite'});
for(const [id,role,name] of [['student','student','Practicante de prueba'],['advisor','advisor','Asesor de prueba'],['admin','admin','Administrador de prueba']]){
 if(!app.db.prepare('SELECT id FROM users WHERE id=?').get(id))app.db.prepare('INSERT INTO users(id,name,email,role,password_hash,must_change) VALUES(?,?,?,?,?,0)').run(id,name,id+'@example.test',role,hashPassword('PruebaInterfaz2026!'));
}
if(!app.db.prepare('SELECT id FROM placements WHERE id=?').get('p-test'))app.db.prepare('INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)').run('p-test','student','advisor','Escuela de prueba','Validación de interfaz','2026-01-01','2027-12-31',480);
app.server.listen(4181,'127.0.0.1',()=>console.log('Pruebas de interfaz en http://127.0.0.1:4181'));
})().catch(()=>{console.error('No se pudo iniciar la instancia de pruebas.');process.exitCode=1;});
