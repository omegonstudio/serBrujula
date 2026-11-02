# SER BRÚJULA — Project Overview

## Qué es

Ser Brújula es un espacio de autoconocimiento, aceptación, amor propio y conexión con el cuerpo. La idea central es **el cuerpo como brújula**.

Acompaña procesos de autoconocimiento mediante masajes, automasajes, movilidad, estiramientos, hábitos saludables, cuidado de la piel, cosmética natural, productos de autocuidado, experiencias educativas, formaciones profesionales y comunidad.

## Identidad conceptual

- **Artemisa:** naturaleza, intuición, independencia, lo instintivo.
- **Sagitario:** arco, flecha, dirección, visión.
- **Brújula:** orientación, autoconocimiento, camino propio.

La identidad visual debe transmitir sensibilidad, naturaleza, profesionalismo, cercanía y bienestar. No es una estética genérica de spa ni una web comercial convencional.

## Visión del producto

Una **única plataforma modular** que evoluciona en siete etapas, sin reconstruir la arquitectura:

| Etapa | Nombre | Objetivo |
|-------|--------|----------|
| 1 | Web + ecommerce | Sitio institucional autoadministrable y venta de productos físicos |
| 2 | Reservas online | Sistema propio tipo Calendly + Google Calendar |
| 3 | Talleres online | Inscripciones, cupos, videollamadas |
| 4 | Cursos grabados | Biblioteca, progreso, acceso |
| 5 | Membresía | Suscripciones y contenido exclusivo |
| 6 | Comunidad | Espacio privado, eventos, recursos |
| 7 | Formaciones profesionales | Programas, alumnas, seguimiento |

## Áreas de la plataforma

1. **Sitio público** — experiencia de visitantes (secciones habilitadas progresivamente).
2. **Administración** — panel para quien opera el negocio (sin conocimientos técnicos).
3. **Área privada de clientas** — preparada arquitectónicamente; en etapas 1–2 la compra y reserva no obligan a crear cuenta.

## Principios

1. No sacrificar calidad por velocidad.
2. No sobreingenierizar.
3. No desarrollar funcionalidades futuras antes de necesitarlas.
4. No perder de vista el producto final.
5. No duplicar componentes ni lógica.
6. Evaluar impacto antes de modificar funcionalidades existentes.
7. Migraciones controladas en base de datos.
8. Sin credenciales en el repositorio.
9. Un flujo no está terminado si solo “se ve bien”.
10. Experiencia coherente entre módulos.
11. Documentación actualizada.
12. Respetar Cursor Rules en cada tarea.
13. Código mantenible y comprensible.
14. Revisar relaciones entre módulos antes de cambiar.
15. Sin dependencias innecesarias.

## Referencia visual

El proyecto YAMI (`yamila-velay-landing`) se usa **solo** como referencia de craft estético. No se reutiliza su código, arquitectura, componentes, dependencias ni lógica. El sistema visual propio está en [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Estado actual

- **Fase A:** fundamentos documentados y Cursor Rules — completa.
- **Fase B:** Next.js, Prisma etapa 1, auth admin, tests — completa.
- **Fase C:** web, ecommerce, CMS, admin, pagos — completa (TESTING).
- **Fase D:** reservas + Google Calendar — completa (TESTING).

Ver [ROADMAP.md](./ROADMAP.md) y [TASK_TRACKER.md](./TASK_TRACKER.md).

## Documentación relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
