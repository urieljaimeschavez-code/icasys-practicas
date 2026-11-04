// One-time conversion, retained for review. Do not rerun on already upgraded files.
import fs from 'node:fs';
import {parse} from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

for(const filename of ['server.cjs','lib/auth.cjs']){
 let source=fs.readFileSync(filename,'utf8');
 if(source.includes('openBackend'))throw Error('La conversión ya se ejecutó.');
 if(filename==='server.cjs'){
  source=source.replace("const {openDatabase,hashPassword,transaction,id}=require('./lib/database.cjs');", "const {hashPassword,id}=require('./lib/database.cjs');\nconst {openBackend}=require('./lib/backend.cjs');\nconst {SupabaseStorage}=require('./lib/storage.cjs');\nconst transaction=(db,work)=>db.transaction(work);");
  source=source.replace("secure=process.env.COOKIE_SECURE==='1'}={})", "secure=process.env.COOKIE_SECURE==='1',driver=process.env.DB_DRIVER||'sqlite',pool,storage:providedStorage}={})");
  source=source.replace('function createApplication(', 'async function createApplication(');
  source=source.replace('const db=openDatabase(directory,bootstrap);',"const db=await openBackend({directory,bootstrap,driver,pool});\n const storage=providedStorage||(db.driver==='postgres'?new SupabaseStorage():null);");
  source=source.replace("if(require.main===module){", "async function main(){\ntry{process.loadEnvFile(path.join(__dirname,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}\n");
  source=source.replace('module.exports={createApplication};',"if(require.main===module)main().catch(()=>{console.error('No se pudo iniciar. Revisa la configuración y ejecuta el diagnóstico npm run cloud:check si usas Supabase.');process.exitCode=1;});\nmodule.exports={createApplication};");
  source=source.replace('return {server,db,close:', 'return {server,db:db.raw,backend:db,close:');
  source=source.replace('server.close(()=>{db.close();resolve()})','server.close(async()=>{await db.close();resolve()})');
 }
 const ast=parse(source,{sourceType:'script'});
 traverse(ast,{
  Function(p){
   const name=p.node.id?.name || (p.parentPath.isVariableDeclarator()?p.parentPath.node.id.name:'');
   if(['createApplication','getPlacement','state','storeEvidence','session','createSession'].includes(name))p.node.async=true;
   if(p.parentPath.isCallExpression()&&t.isIdentifier(p.parentPath.node.callee,{name:'transaction'}))p.node.async=true;
   if(name==='audit')p.node.async=true;
  },
  CallExpression:{exit(p){
   const c=p.node.callee;
   let shouldAwait=t.isIdentifier(c)&&['audit','getPlacement','state','storeEvidence','transaction','createApplication'].includes(c.name);
   if(t.isMemberExpression(c)&&t.isIdentifier(c.object,{name:'auth'})&&['session','createSession'].includes(c.property.name))shouldAwait=true;
   if(t.isMemberExpression(c)&&['all','get','run'].includes(c.property.name)&&t.isCallExpression(c.object)&&t.isMemberExpression(c.object.callee)&&t.isIdentifier(c.object.callee.object,{name:'db'})&&t.isIdentifier(c.object.callee.property,{name:'prepare'}))shouldAwait=true;
   if(shouldAwait&&!p.parentPath.isAwaitExpression()){p.replaceWith(t.awaitExpression(p.node));p.skip();}
  }}
 });
 fs.writeFileSync(filename,generate(ast,{comments:true}).code+'\n');
}
