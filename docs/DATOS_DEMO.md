# Conjunto de datos de demostración

Carga realizada y verificada el 21 de noviembre de 2026, por solicitud del residente para presentar el funcionamiento del sistema.

## Alcance de la carga

Se agregaron 42 actividades, 36 revisiones simuladas, 24 evidencias descargables de texto y una estancia histórica. Se conservaron las tres cuentas existentes y sus contraseñas, correos, vinculaciones Auth y perfiles.

La estancia principal conserva su identificador y configuración original. Se agregaron 30 actividades: 22 aprobadas de seis horas, cuatro en revisión de seis horas, dos con correcciones de cuatro horas y dos borradores de tres horas. Cubren requerimientos, modelado, formularios, evidencias, revisiones, reportes, pruebas, manuales y preparación de la presentación.

La estancia histórica está identificada como **[Demo] Estancia histórica: soporte y documentación**. Corresponde al mismo practicante y asesor, del 1 de junio al 28 de agosto de 2026. Tiene doce actividades aprobadas que suman la meta de noventa horas y permite demostrar un reporte completo.

## Estado inmediatamente posterior

| Elemento | Resultado |
|---|---:|
| Cuentas | 3, sin modificaciones por esta carga |
| Estancias | 2 |
| Actividades totales | 46 |
| Actividades de la estancia principal | 34 |
| Horas aprobadas de la principal | 136 |
| Horas en revisión de la principal | 26 |
| Avance de la principal, meta 480 h | 28 % redondeado |
| Horas aprobadas de la histórica | 90 de 90 |
| Archivos de evidencia nuevos | 24 |

Los borradores solo los ve el practicante y el administrador, conforme a los permisos del portal. Los conteos pueden cambiar cuando el usuario apruebe, edite o registre actividades después de esta carga.

## Identificación y trazabilidad

Todos los títulos nuevos comienzan con **[Demo]** y las descripciones y archivos indican que son ficticios y no acreditan trabajo ni horas reales. Las aprobaciones y correcciones se identifican expresamente como simuladas; no son decisiones auténticas del asesor. El evento **demo_dataset_loaded** deja constancia de la carga operativa, con actor de sistema.

Los identificadores nuevos utilizan el prefijo `demo-20261121-v1`. El generador `scripts/demo-data.cjs` permite reconocerlos y el comando `node scripts/cloud-demo-seed.cjs` aplica el conjunto. No crea usuarios ni llama a Supabase Auth.

La carga es repetible: omite actividades que ya existan y no reemplaza los cambios posteriores de los usuarios. No se deben borrar identidades Auth ni ejecutar cloud:init o cloud:import para cargar ejemplos. Cualquier retiro de los registros de demostración debe planificarse aparte, conservando los registros originales.

## Verificación realizada

Antes de cargar, se guardó una copia privada de las tablas operativas anteriores en `data/antes-datos-demo-<fecha>.json`. Esa copia incluye referencias a los archivos, no sus contenidos; no sustituye un respaldo completo de PostgreSQL y Storage.

Después de cargar se compararon los trece registros originales de estancias, actividades, revisiones y evidencias con la copia: permanecieron iguales. Se descargaron las 24 evidencias nuevas y se verificaron su tamaño y SHA-256. El depósito siguió siendo privado.

Las pruebas de datos verificaron fechas dentro de cada estancia, límites de horas, sumas, distintos estados, repetición sin duplicados y conservación de cuentas y registros anteriores. Estos datos son para la maqueta de evaluación y no deben presentarse como horas reales realizadas por el residente.

## Cómo mostrar el conjunto

Recargar el portal o pulsar Actualizar datos. En Inicio, Mis prácticas y Mis reportes se pueden alternar las dos estancias mediante el selector. Los filtros permiten mostrar registros aprobados, en revisión o con correcciones; una actividad pendiente permite probar una revisión real del portal sobre un ejemplo simulado. Las evidencias se descargan desde Ver detalle.
