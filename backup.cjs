const path=require('node:path'),fs=require('node:fs');
try{process.loadEnvFile(path.join(__dirname,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(process.env.DB_DRIVER==='postgres'){
 console.error('Este comando respalda solo SQLite. Para Supabase respalda PostgreSQL y Storage por separado; consulta docs/SUPABASE.md.');
 process.exit(1);
}
const {backup}=require('node:sqlite');
const {openDatabase}=require('./lib/database.cjs');
const directory=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
if(!fs.existsSync(path.join(directory,'icasys.sqlite')))throw Error('Inicia primero el sistema para crear la base de datos.');
const output=path.join(directory,'respaldos');fs.mkdirSync(output,{recursive:true});
const target=path.join(output,`icasys-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`),db=openDatabase(directory,false);
backup(db,target).then(()=>console.log(`Respaldo completo (incluye evidencias): ${target}`)).finally(()=>db.close());
