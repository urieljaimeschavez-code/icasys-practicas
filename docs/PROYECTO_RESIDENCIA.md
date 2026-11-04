# Proyecto de residencia profesional

## Portada por completar

**Título:** Desarrollo de un sistema web para la gestión y seguimiento de prácticas profesionales en ICASYS.

- Residente: [Nombre completo del alumno]
- Número de control: [Por completar]
- Institución educativa y carrera: [Por completar]
- Organización receptora: ICASYS [Confirmar denominación oficial]
- Asesor interno: [Por completar]
- Asesor externo: [Por completar]
- Periodo de residencia: [Por completar con fechas reales]
- Versión de software documentada: 2.0

Este documento es una base editable del informe. Su estructura debe ajustarse al formato de la institución educativa. No acredita implementación en la página pública ni aceptación oficial del proyecto.

## Resumen

El proyecto desarrolla una aplicación web independiente para registrar y dar seguimiento a estancias de prácticas profesionales. Incluye cuentas individuales de practicante, asesor y administrador, asignación de estancias, bitácora de actividades, evidencias, revisión, cálculo de horas aprobadas y reportes. El sistema utiliza Node.js y SQLite, conserva una identidad visual basada en el portal ICASYS y funciona localmente para su evaluación. La integración al sitio institucional constituye una etapa posterior sujeta a aprobación y revisión de infraestructura.

## Planteamiento del problema

Se propone centralizar el seguimiento de actividades y horas de practicantes en un expediente accesible según responsabilidades. Sin un registro unificado de entregas y revisiones puede resultar difícil identificar qué actividades están pendientes, qué horas fueron validadas y cuáles requieren corrección.

Lo anterior representa la necesidad que aborda la propuesta, no un diagnóstico confirmado de los procesos internos de ICASYS. Deben documentarse entrevistas con responsables, herramientas utilizadas actualmente, dificultades observadas y reglas operativas para sustentar el problema final. No se afirma que la organización carezca de otro sistema sin haberlo validado.

## Justificación

Un expediente por estancia permite relacionar actividades, evidencias y decisiones del asesor, separar horas pendientes de aprobadas y generar un reporte consistente. Las cuentas individuales y la autorización en servidor sustituyen el cambio libre de perfiles del primer prototipo. La base de datos permite persistencia independiente del navegador y respaldos del expediente.

Para la formación del residente, el proyecto integra análisis de requerimientos, diseño de datos, desarrollo de interfaz y servidor, autenticación, pruebas y documentación. La utilidad institucional deberá evaluarse con los responsables y usuarios previstos.

## Objetivo general

Desarrollar y validar en un entorno de evaluación un sistema web con autenticación y base de datos para gestionar estancias profesionales, registrar actividades y evidencias, revisar entregas y consultar el avance de horas de los practicantes de ICASYS.

## Objetivos específicos

1. Definir roles, requerimientos, reglas y alcance del seguimiento de estancias.
2. Diseñar un modelo relacional para usuarios, asignaciones, actividades, evidencias y revisiones.
3. Implementar cuentas individuales y permisos según rol y estancia asignada.
4. Desarrollar registro, corrección, revisión y aprobación de actividades.
5. Generar avances y reportes a partir de las horas aprobadas.
6. Verificar autenticación, autorización, integridad y persistencia mediante pruebas.
7. Elaborar manuales de usuario, instalación, operación y documentación técnica.

## Alcance

Incluye operación local con tres perfiles, gestión de usuarios, asignación de estancias, bitácora con borradores, evidencias de hasta 2 MB, revisión e historial de comentarios, reportes CSV e impresión/PDF, auditoría y respaldo consistente.

No incluye integración con la base institucional, publicación pública, migración automática de cuentas de ICASYS, firma electrónica, constancias oficiales, notificaciones, recuperación por correo, antivirus de archivos ni aprobación de liberación de residencia. Los datos iniciales son de evaluación y deben sustituirse por datos autorizados al formalizar el uso.

## Marco técnico

La arquitectura cliente-servidor separa presentación de validación y persistencia. Node.js procesa solicitudes HTTP; SQLite conserva entidades relacionadas mediante claves foráneas y transacciones. Se utilizan consultas parametrizadas, contraseñas derivadas con sal, sesiones en cookie HttpOnly, control CSRF y autorización por asignación. El avance se calcula a partir de actividades aprobadas para evitar acumulaciones duplicadas.

Las decisiones detalladas, fuentes de documentación oficial y limitaciones están en MANUAL_TECNICO.md. El modelo entidad-relación y diccionario se encuentran en BASE_DE_DATOS.md.

## Metodología de desarrollo

Se siguió un desarrollo incremental: revisión visual del portal de referencia, definición del módulo de prácticas profesionales, construcción de una maqueta navegable, prueba de su flujo con el usuario y evolución a un sistema con persistencia y autenticación. La fase actual agrega controles en servidor, modelo SQL y pruebas de integración.

Para el informe académico debe complementarse cada fase con fechas reales, decisiones revisadas por asesores y evidencias de trabajo. No se declara una metodología institucional específica ni ceremonias que no se realizaron.

## Entregables y estado

| Entregable | Estado |
|---|---|
| Interfaz basada en el portal ICASYS | Implementada |
| API y base de datos relacional | Implementadas |
| Cuentas, sesiones y permisos | Implementados y probados en servidor |
| Gestión de usuarios y estancias | Implementada |
| Bitácora, evidencias y revisiones | Implementadas |
| CSV e impresión/PDF | Implementados; requieren aceptación de versión final en interfaz |
| Manuales y modelo de datos | Entregados como documentos editables |
| Pruebas de integración | Ejecutadas con resultado aprobado |
| Aceptación de ICASYS y escuela | Pendiente |
| Integración al sitio institucional | Fuera de esta etapa |

## Resultados verificables

El conjunto automatizado ejecutado reportó 13 pruebas aprobadas y ninguna fallida, incluyendo control de acceso, corrección y aprobación, evidencias restringidas, persistencia tras reapertura y respaldo de datos. La pantalla de acceso fue revisada visualmente. No se midieron mejoras porcentuales en productividad, tiempos administrativos ni satisfacción de usuarios; esas métricas requieren evaluación real.

## Plan para cierre de residencia

1. Validar requerimientos y reglas con los asesores.
2. Completar el guion de aceptación de los tres perfiles y registrar incidencias.
3. Ajustar el sistema con resultados reales de esa evaluación.
4. Completar portada, contexto de la empresa, cronograma real, evidencias y formato escolar.
5. Entregar código, manuales, esquema de base de datos, pruebas y procedimiento de instalación.
6. Obtener la evaluación y aceptación por las instancias correspondientes.

El cronograma debe construirse con el periodo de residencia indicado por el alumno. No se asignan fechas ficticias para actividades ya realizadas.

## Conclusiones de la etapa actual

Se dispone de una implementación local con persistencia relacional y acceso individual por responsabilidades. La siguiente validación consiste en utilizar los tres perfiles en escenarios completos, confirmar requisitos con ICASYS y adecuar el informe al formato académico. El estado funcional local no constituye por sí mismo una certificación de seguridad ni una autorización de despliegue institucional.

## Anexos

- MANUAL_USUARIO.md
- INSTALACION.md
- MANUAL_TECNICO.md
- BASE_DE_DATOS.md y lib/schema.sql
- PRUEBAS.md y tests/system.test.cjs
- Capturas de la versión implementada
- [Agregar acta de aceptación, entrevistas y evidencias reales cuando estén disponibles]

