const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
function boot(hash,ok=true){
 const elements=new Map(),requests=[],navigation=[];
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{value:"",innerHTML:"",textContent:"",style:{},open:false,disabled:false,addEventListener(){},close(){this.open=false;}});return elements.get(selector);};
 const location={hash,pathname:"/",search:""};
 const context={document:{querySelector:element,querySelectorAll:()=>[],body:{classList:{remove(){},add(){}}}},window:{},location,
  history:{replaceState(a,b,url){navigation.push(url);location.hash="";}},setTimeout:()=>1,clearTimeout(){},
  fetch:async(url,options)=>{requests.push({url,options});return {ok,status:ok?200:400,json:async()=>ok?{message:"Contraseña actualizada. Inicia sesión."}:{error:"El enlace ya se usó o ha caducado."}};},
 };
 vm.runInNewContext(source,context,{filename:"app.js"});return {element,requests,navigation,context};
}
for(const prefix of ["#supabase-recuperar/","#recuperar/"]){
 test("Cliente: abrir enlace directamente muestra formulario y envía el token correcto ("+prefix+")",async()=>{
  const token="a".repeat(64),f=boot(prefix+token);
  assert.match(f.element('#auth-content').innerHTML,/Elige una contraseña nueva/);
  assert.equal(f.requests.length,0);assert.deepEqual(f.navigation,["/"]);
  f.element('#recovery-password').value="NuevaSegura2026!";f.element('#recovery-confirm').value="NuevaSegura2026!";
  f.element('#recovery-complete').onsubmit({preventDefault(){},submitter:{disabled:false}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,"/api/recovery/complete");
  assert.deepEqual(JSON.parse(f.requests[0].options.body),{token,password:"NuevaSegura2026!"});
  assert.match(f.element('#auth-content').innerHTML,/Bienvenido de nuevo/);
 });
}
test("Cliente: enlace caducado informa del error y no expone el token en la URL",async()=>{
 const f=boot("#supabase-recuperar/"+"b".repeat(64),false);
 f.element('#recovery-password').value="NuevaSegura2026!";f.element('#recovery-confirm').value="NuevaSegura2026!";
 f.element('#recovery-complete').onsubmit({preventDefault(){},submitter:{disabled:false}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(f.element('#recovery-complete-error').textContent,/caducado/);assert.equal(f.context.location.hash,"");
});
test("Cliente: una plantilla antigua con access_token no ingresa automáticamente ni conserva el secreto",()=>{
 const f=boot("#access_token=private-example&type=recovery");
 assert.equal(f.context.location.hash,"");assert.equal(f.requests.length,0);
 assert.match(f.element('#auth-content').innerHTML,/plantilla/);assert.ok(!f.element('#auth-content').innerHTML.includes('private-example'));
});
