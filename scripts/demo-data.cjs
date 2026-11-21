const {createHash}=require('node:crypto');
const PREFIX='demo-20261121-v1';
function dataset(main){
 const phases=[
  ['2026-09-07','Levantamiento de requerimientos','Se identificaron necesidades del practicante, asesor y coordinación. Se documentaron entradas, salidas y criterios de aceptación.'],
  ['2026-09-09','Inventario de procesos de prácticas','Se describió el proceso de registro, revisión y aprobación de actividades, incluyendo excepciones y responsables.'],
  ['2026-09-11','Definición de perfiles y permisos','Se elaboró una matriz para diferenciar las acciones de practicante, asesor y administrador.'],
  ['2026-09-14','Matriz de requerimientos funcionales','Se organizaron los requerimientos por prioridad y se relacionaron con los casos de uso del portal.'],
  ['2026-09-16','Diseño del flujo de actividades','Se definieron los estados borrador, en revisión, corrección y aprobación, así como sus transiciones.'],
  ['2026-09-18','Modelo de datos de la estancia','Se representaron las relaciones entre usuarios, estancias, actividades, revisiones y evidencias.'],
  ['2026-09-21','Preparación del entorno de desarrollo','Se documentó la estructura del proyecto, sus dependencias y el procedimiento de ejecución local.'],
  ['2026-09-23','Prototipo de navegación del portal','Se construyeron las vistas iniciales y se revisó la consistencia de logotipo, colores y navegación.'],
  ['2026-09-25','Formulario de registro de actividades','Se preparó un formulario con descripción, fecha, horas y validación de campos obligatorios.'],
  ['2026-09-28','Validación de fechas y horas','Se comprobaron límites de horas por actividad e intervalos permitidos dentro de la estancia.'],
  ['2026-09-30','Carga de evidencias privadas','Se diseñó el proceso de carga y descarga de evidencias con acceso restringido a participantes autorizados.'],
  ['2026-10-02','Comprobación de archivos adjuntos','Se revisaron tipos de archivo, límite de tamaño y comprobación de integridad de las evidencias.'],
  ['2026-10-05','Pantalla de revisión del asesor','Se integraron acciones para aprobar entregas y solicitar correcciones con comentarios.'],
  ['2026-10-07','Historial de retroalimentación','Se organizó una secuencia de comentarios para mostrar las revisiones de cada actividad.'],
  ['2026-10-09','Indicadores de avance de prácticas','Se calcularon horas aprobadas, pendientes y porcentaje de avance respecto a la meta.'],
  ['2026-10-12','Búsqueda y filtros de la bitácora','Se probaron consultas por título y filtros por estado para localizar registros.'],
  ['2026-10-14','Exportación de reportes CSV','Se verificó la estructura de las columnas, los comentarios y el resumen de horas exportadas.'],
  ['2026-10-16','Impresión del reporte académico','Se revisó la presentación del reporte y su lectura al imprimir o guardar como PDF.'],
  ['2026-10-19','Administración de usuarios','Se prepararon altas, edición y restablecimiento administrativo de contraseñas.'],
  ['2026-10-21','Asignación de asesores y estancias','Se comprobaron las relaciones de una estancia con su practicante y su asesor responsable.'],
  ['2026-10-23','Pruebas de separación de permisos','Se documentaron casos de acceso permitido y rechazado para cada uno de los tres perfiles.'],
  ['2026-10-26','Pruebas del flujo de aprobación','Se ejecutó un recorrido de entrega, solicitud de corrección, reenvío y aprobación de horas.'],
 ];
 const extras=[
  ['2026-11-09','pending',6,'Manual de usuario del practicante','Se organizó el manual con instrucciones de acceso, bitácora, evidencias y consulta de reportes.'],
  ['2026-11-11','pending',6,'Manual de usuario del asesor','Se prepararon ejemplos de revisión y comentarios de retroalimentación para el asesor.'],
  ['2026-11-13','pending',6,'Revisión de acceso desde otro equipo','Se documentaron los pasos de acceso al sitio publicado y los resultados de navegación entre perfiles.'],
  ['2026-11-16','pending',6,'Casos de recuperación de acceso','Se prepararon casos de recuperación, caducidad de enlaces y cierre de sesiones anteriores.'],
  ['2026-11-17','correction',4,'Revisión del manual técnico','Se presentó una versión del manual técnico para revisión de diagramas y explicación de componentes.'],
  ['2026-11-18','correction',4,'Organización de evidencias de pruebas','Se reunieron resultados de pruebas; está pendiente mejorar su identificación y relación con cada caso.'],
  ['2026-11-19','draft',3,'Guion de presentación del proyecto','Se preparó un borrador de la demostración y del orden de las pantallas que se presentarán.'],
  ['2026-11-20','draft',3,'Conclusiones del informe de avance','Se inició la redacción de resultados, limitaciones y siguientes actividades del proyecto.'],
 ];
 const make=(placement,date,status,hours,title,description,index)=>({
  id:`${PREFIX}-${placement===main.id?'main':'history'}-${String(index+1).padStart(2,'0')}`,
  placement_id:placement,date,status,hours,title:'[Demo] '+title,
  description:'DATOS DE DEMOSTRACIÓN. Registro simulado para presentación; no acredita trabajo ni horas reales.\n\n'+description,
  version:status==='approved'||status==='correction'?2:1,
  created_at:date+' 08:00:00',updated_at:date+' 17:30:00',
  evidence:index%2===0||status==='pending'||status==='correction',
 });
 const activities=phases.map((r,i)=>make(main.id,r[0],'approved',6,r[1],r[2],i));
 extras.forEach((r,i)=>activities.push(make(main.id,r[0],r[1],r[2],r[3],r[4],i+phases.length)));
 const historic={id:PREFIX+'-history',student_id:main.student_id,advisor_id:main.advisor_id,school:'Institución educativa de demostración',project:'[Demo] Estancia histórica: soporte y documentación',start:'2026-06-01',end:'2026-08-28',target:90};
 const prior=[
  ['2026-06-05','Diagnóstico inicial de equipos'],['2026-06-12','Inventario de recursos tecnológicos'],
  ['2026-06-19','Clasificación de incidencias de soporte'],['2026-06-26','Procedimientos de mantenimiento preventivo'],
  ['2026-07-03','Documentación de configuraciones de red'],['2026-07-10','Guía de organización de archivos'],
  ['2026-07-17','Bitácora de atención a solicitudes'],['2026-07-24','Pruebas de respaldo y recuperación'],
  ['2026-07-31','Actualización del manual de soporte'],['2026-08-07','Validación de listas de comprobación'],
  ['2026-08-14','Preparación del informe de cierre'],['2026-08-21','Entrega de documentación de soporte'],
 ];
 prior.forEach((r,i)=>activities.push(make(historic.id,r[0],'approved',i<10?8:5,r[1],'Se realizó un ejercicio de documentación de soporte y se registraron sus resultados, observaciones y criterios de revisión.',i)));
 return {prefix:PREFIX,historic,activities};
}
function evidenceFor(a){
 const content=Buffer.from('ICASYS · Evidencia de demostración\n=================================\n\n'+
  'Este archivo es ficticio. No acredita trabajo, evaluación ni horas reales.\n\n'+
  'Actividad: '+a.title+'\nFecha: '+a.date+'\nHoras simuladas: '+a.hours+'\n\n'+a.description+'\n\n'+
  'Lista de comprobación del ejemplo:\n- Objetivo y alcance descritos.\n- Resultado de la actividad documentado.\n- Observaciones para revisión del asesor registradas.\n\n'+
  'Contenido de apoyo para probar la descarga privada de evidencias del portal.\n','utf8');
 return {name:a.id+'.txt',mime:'text/plain',content,size:content.length,sha256:createHash('sha256').update(content).digest('hex')};
}
function objectKey(activityId){
 const h=createHash('sha256').update(activityId).digest('hex').slice(0,32);
 return 'activities/'+[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
async function seedDemo(db,storage,{mainId='p1',beforeWrite=async()=>{}}={}){
 const main=await db.prepare('SELECT * FROM placements WHERE id=?').get(mainId);
 if(!main)throw Error('No existe la estancia principal.');
 const plan=dataset(main),pending=[];
 for(const a of plan.activities){
  const p=a.placement_id===main.id?main:plan.historic;
  if(a.date<p.start||a.date>p.end)throw Error('La fecha de demostración no cabe en la estancia.');
  if(!await db.prepare('SELECT id FROM activities WHERE id=?').get(a.id))pending.push(a);
 }
 if(!pending.length)return {inserted:0,evidence:0,placement:0};
 await beforeWrite();
 const uploaded=new Map();
 // Subidas sin sobrescritura; el diario permite recuperar una ejecución interrumpida.
 for(const a of pending.filter(a=>a.evidence)){
  const e=evidenceFor(a);
  if(db.driver==='postgres'){
   const key=objectKey(a.id);
   await db.prepare('INSERT INTO storage_uploads(storage_key) VALUES(?) ON CONFLICT(storage_key) DO NOTHING').run(key);
   try{await storage.upload(e,key);}catch(error){
    const prior=await storage.download(key);
    if(createHash('sha256').update(prior).digest('hex')!==e.sha256)throw Error('La evidencia existente no corresponde a este conjunto.');
   }
   e.storage_key=key;
  }
  uploaded.set(a.id,e);
 }
 let inserted=0,evidence=0,placement=0;
 await db.transaction(async()=>{
  await db.lockPlacement(main.id);
  const fresh=await db.prepare('SELECT * FROM placements WHERE id=?').get(main.id);
  if(!fresh||fresh.student_id!==main.student_id||fresh.advisor_id!==main.advisor_id||fresh.start!==main.start||fresh.end!==main.end)throw Error('La estancia cambió durante la carga.');
  const h=plan.historic;
  placement=(await db.prepare('INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(h.id,h.student_id,h.advisor_id,h.school,h.project,h.start,h.end,h.target)).changes;
  const existing=await db.prepare('SELECT student_id,advisor_id FROM placements WHERE id=?').get(h.id);
  if(existing.student_id!==h.student_id||existing.advisor_id!==h.advisor_id)throw Error('La estancia histórica tiene otra asignación.');
  for(const a of pending){
   const created=await db.prepare('INSERT INTO activities(id,placement_id,title,description,date,hours,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(a.id,a.placement_id,a.title,a.description,a.date,a.hours,a.status,a.version,a.created_at,a.updated_at);
   if(!created.changes)continue;
   inserted++;
   if(a.status==='approved'||a.status==='correction'){
    const comment=a.status==='approved'?'[DEMO] Aprobación simulada: evidencia y descripción revisadas para mostrar el flujo del portal. No acredita horas reales.':
     '[DEMO] Corrección simulada: agrega resultados concretos, identifica la evidencia y explica cómo verificaste el resultado antes de reenviar.';
    await db.prepare('INSERT INTO reviews(id,activity_id,reviewer_id,decision,comment,created_at) VALUES(?,?,?,?,?,?)').run(a.id+'-review',a.id,main.advisor_id,a.status,comment,a.date+' 17:00:00');
   }
   const e=uploaded.get(a.id);
   if(e){
    if(db.driver==='postgres'){
     await db.prepare('INSERT INTO evidence(activity_id,name,mime,storage_key,size,sha256) VALUES(?,?,?,?,?,?)').run(a.id,e.name,e.mime,e.storage_key,e.size,e.sha256);
     await db.prepare('DELETE FROM storage_uploads WHERE storage_key=?').run(e.storage_key);
    }else await db.prepare('INSERT INTO evidence(activity_id,name,mime,content,size,sha256) VALUES(?,?,?,?,?,?)').run(a.id,e.name,e.mime,e.content,e.size,e.sha256);
    evidence++;
   }
  }
  if(inserted)await db.prepare('INSERT INTO audit_log(user_id,action,entity_id) VALUES(NULL,?,?)').run('demo_dataset_loaded',PREFIX);
 });
 return {inserted,evidence,placement};
}
module.exports={dataset,evidenceFor,seedDemo,PREFIX};
