const {connect,reportError,fs,path}=require('./cloud-common.cjs');
const {seedDemo}=require('./demo-data.cjs');
(async()=>{
 const {db,storage}=await connect();
 try{
  const result=await seedDemo(db,storage,{beforeWrite:async()=>{
   const snapshot={note:'Estado operativo previo a carga demo. No es un respaldo completo de PostgreSQL ni de los archivos de Storage.',created_at:new Date().toISOString()};
   for(const table of ['placements','activities','reviews','evidence'])snapshot[table]=await db.prepare('SELECT * FROM '+table).all();
   const directory=path.join(__dirname,'../data');fs.mkdirSync(directory,{recursive:true});
   const file=path.join(directory,'antes-datos-demo-'+Date.now()+'.json');
   fs.writeFileSync(file,JSON.stringify(snapshot,null,2),{flag:'wx',mode:0o600});
   console.log('Copia operativa previa guardada en la carpeta privada data.');
  }});
  console.log(JSON.stringify(result));
  console.log('Solo se agregaron registros identificados como demostración. No se cambiaron cuentas ni contraseñas.');
  console.log(JSON.stringify(await db.prepare('SELECT placement_id,status,COUNT(*) AS activities,SUM(hours) AS hours FROM activities GROUP BY placement_id,status ORDER BY placement_id,status').all()));
 }finally{await db.close();}
})().catch(reportError);
