# SER BRÚJULA — Roadmap

Estados permitidos: `NOT_STARTED` | `PLANNED` | `IN_PROGRESS` | `TESTING` | `COMPLETED`.

Una funcionalidad no se marca `COMPLETED` hasta estar implementada y probada.

---

## Etapa 1 — Web autoadministrable y ecommerce

**Estado:** `TESTING`

### Objetivo

Web profesional que presenta el proyecto y vende productos físicos, con panel admin usable por no-técnicos.

### Funcionalidades

- Sitio: Inicio, Sobre Ser Brújula, Servicios (informativo + CTA contacto), Tienda, Contacto.
- Catálogo, categorías, búsqueda/filtros básicos, fichas, carrito, checkout (envío/retiro).
- Mercado Pago, pedidos, inventario, historial de estados.
- Admin: dashboard, productos, pedidos, contenidos editables.
- Correos de confirmación / consulta.

### Dependencias

- Fase B (scaffold, DB, auth admin).
- Credenciales MP, Resend, storage.

### Entidades

User, AdminProfile, CustomerProfile, SiteContent, Product*, Inventory, Cart*, Order*, Payment, Shipment.

### Integraciones

Mercado Pago, Resend, S3-compatible.

### Riesgos

Stock concurrente; webhooks duplicados; confiar en redirect de pago; CMS genérico de más.

### Criterios de aceptación

- [ ] Flujo completo de compra E2E (producto → pago aprobado vía webhook → pedido visible en admin).
- [ ] Precios y stock validados solo en servidor.
- [ ] Contenidos e imágenes editables sin tocar código.
- [ ] Responsive, accesible, estados vacíos/carga/error.
- [ ] Sin secciones futuras presentadas como disponibles.

---

## Etapa 2 — Reservas online + Google Calendar

**Estado:** `TESTING`

### Objetivo

Reservar sesiones desde la web sin depender de Calendly; Google Calendar como calendario sincronizado.

### Funcionalidades

- Catálogo de servicios (admin), modalidades consultorio/domicilio.
- Disponibilidad, excepciones, generación de slots.
- Formulario de reserva, pago según configuración, confirmaciones.
- Cancelación y reprogramación.
- OAuth Google, FreeBusy, creación/actualización/borrado de eventos.
- Admin de agenda.

### Dependencias

- Etapa 1 (pagos, identity, mail, admin shell).
- Google Cloud OAuth credentials.

### Entidades

Service, ServiceLocation, AvailabilityRule, AvailabilityException, Booking, BookingHold, CalendarConnection, CalendarEvent (+ Payment).

### Integraciones

Google Calendar (OAuth, FreeBusy, Events), Mercado Pago, Resend.

### Riesgos

Doble reserva; desfase TZ; tokens OAuth; outage de Google; solapes con eventos personales.

### Criterios de aceptación

- [ ] Slot confirmado existe en DB y en Google Calendar.
- [ ] Eventos personales de Google bloquean disponibilidad.
- [ ] Dos usuarios no pueden confirmar el mismo horario.
- [ ] Cancelar/reprogramar actualiza DB + Calendar.
- [ ] `syncStatus` refleja la realidad (nunca `SYNCED` si Google falló).

---

## Etapa 3 — Talleres y encuentros online

**Estado:** `NOT_STARTED`

### Objetivo

Catálogo de talleres, cupos, inscripciones y pagos; videollamadas.

### Funcionalidades

Catálogo, fechas, cupos, inscripción, pago, confirmación, admin de participantes, link de sala.

### Dependencias

Etapas 1–2 (pagos, usuarios, notificaciones). Posible Zoom/Meet.

### Entidades (futuro)

Workshop, WorkshopSession, WorkshopEnrollment (nombres a confirmar).

### Integraciones

Pagos, mail, proveedor de videollamada.

### Riesgos

Cupos concurrentes; no-shows; calidad del enlace de sala.

### Criterios de aceptación

Inscripción + pago + cupo respetado + confirmación; admin ve participantes.

---

## Etapa 4 — Cursos grabados

**Estado:** `NOT_STARTED`

### Objetivo

Venta de cursos con biblioteca, módulos, lecciones, progreso y materiales.

### Funcionalidades

Catálogo, compra, acceso, reproductor, progreso, descargas.

### Dependencias

Cuentas de clientas; storage de video (CDN/provider); pagos.

### Entidades (futuro)

Course, CourseModule, Lesson, Enrollment, LessonProgress.

### Integraciones

Pagos, storage/CDN video, mail.

### Riesgos

Piratería de acceso; costos de streaming; UX del player.

### Criterios de aceptación

Compra otorga acceso; progreso persistente; sin acceso sin entitlement.

---

## Etapa 5 — Membresía de bienestar

**Estado:** `NOT_STARTED`

### Objetivo

Planes recurrentes con contenido exclusivo (prácticas, hábitos, autocuidado).

### Funcionalidades

Planes, suscripción, billing recurrente, biblioteca según plan.

### Dependencias

Etapa 4 parcialmente; pagos recurrentes (MP/Stripe).

### Entidades (futuro)

MembershipPlan, Subscription, Entitlement.

### Integraciones

Pagos recurrentes, mail.

### Riesgos

Fallos de cobro; downgrade/upgrade; acceso residual.

### Criterios de aceptación

Acceso según estado de suscripción; cancelación deja de cobrar y ajusta acceso.

---

## Etapa 6 — Comunidad y encuentros

**Estado:** `NOT_STARTED`

### Objetivo

Espacio privado: novedades, calendario, eventos presenciales, recursos.

### Funcionalidades

Feed/novedades, eventos, inscripciones, recursos exclusivos.

### Dependencias

Identity de miembros; posiblemente etapa 5.

### Entidades (futuro)

CommunitySpace, CommunityEvent, CommunityEnrollment, CommunityResource.

### Integraciones

Mail; posiblemente calendar.

### Riesgos

Moderación; spam; solape con talleres.

### Criterios de aceptación

Solo miembros autorizados entran; eventos e inscripciones gestionables.

---

## Etapa 7 — Formaciones profesionales

**Estado:** `NOT_STARTED`

### Objetivo

Programas de formación (masajes, visión extraocular, etc.) con seguimiento.

### Funcionalidades

Programas, módulos, inscripciones, materiales, actividades mixtas, seguimiento de alumnas.

### Dependencias

Cursos/comunidad/pagos según diseño final.

### Entidades (futuro)

TrainingProgram, TrainingModule, TrainingEnrollment, TrainingActivity.

### Integraciones

Pagos, mail, storage, posiblemente video.

### Riesgos

Complejidad pedagógica vs producto; solape con etapa 4.

### Criterios de aceptación

Inscripción completa; materiales con control de acceso; admin de cohortes.

---

## Fases de implementación técnica

| Fase | Contenido | Estado |
|------|-----------|--------|
| A | Docs + Cursor Rules | `COMPLETED` |
| B | Scaffold Next, Prisma, auth, envs, tests base | `COMPLETED` |
| C | Etapa 1 completa | `TESTING` |
| D | Etapa 2 completa | `TESTING` |
