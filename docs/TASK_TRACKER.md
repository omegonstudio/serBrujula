# SER BRÚJULA — Task Tracker

Seguimiento entre sesiones. Actualizar al iniciar/cerrar trabajo.  
Estados de ítem: `TODO` | `DOING` | `DONE` | `BLOCKED`.

---

## Fase A — Fundamentos

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| A1 | `docs/PROJECT_OVERVIEW.md` | DONE | |
| A2 | `docs/ARCHITECTURE.md` | DONE | |
| A3 | `docs/DATA_MODEL.md` | DONE | |
| A4 | `docs/ROADMAP.md` | DONE | |
| A5 | `docs/DESIGN_SYSTEM.md` | DONE | Incluye análisis YAMI verificado |
| A6 | `docs/INTEGRATIONS.md` | DONE | |
| A7 | `docs/DEVELOPMENT_GUIDE.md` | DONE | |
| A8 | `docs/TASK_TRACKER.md` | DONE | Este archivo |
| A9 | `.cursor/rules/` 00–09 | DONE | |
| A10 | README + `.gitignore` | DONE | |

---

## Fase B — Fundación técnica

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| B1 | Scaffold Next.js + TS + Tailwind | DONE | Next 15 App Router |
| B2 | Prisma + PostgreSQL + primera migración identity/ecommerce/cms | DONE | docker compose :5434 |
| B3 | `.env.example` + validación de env | DONE | `src/lib/env.ts` |
| B4 | Auth admin (Auth.js) | DONE | credentials + middleware |
| B5 | Estructura `src/modules/*` | DONE | placeholders + PaymentProvider |
| B6 | Logger + errores de dominio | DONE | lib/logger, lib/errors |
| B7 | Vitest + Playwright base | DONE | smoke E2E |
| B8 | Deploy skeleton (Vercel) | DONE | vercel.json |

---

## Fase C — Etapa 1

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| C1 | Design system UI tokens + componentes base | DONE | |
| C2 | Layout público (nav, footer) | DONE | |
| C3 | Páginas: Inicio, Sobre, Servicios, Contacto | DONE | CMS-driven |
| C4 | CMS admin + SiteContent | DONE | /admin/contenidos |
| C5 | Catálogo + fichas producto | DONE | |
| C6 | Carrito | DONE | cookie sb_cart |
| C7 | Checkout envío/retiro | DONE | |
| C8 | Mercado Pago + webhooks idempotentes | DONE | Sandbox 2026-11-26 OK (APPROVED/PAID/stock/webhook firmado); unit 47 OK; residuos: pedidos PENDING abandonados, IPN legacy 401, E2E MANUAL a revalidar |
| C9 | Pedidos + inventario | DONE | confirmación atómica |
| C10 | Admin dashboard / productos / pedidos | DONE | |
| C11 | Resend (pedido + contacto) | DONE | Contacto: éxito solo si envío real; sin API key → error UX; logs sin PII (E2.1) |
| C12 | E2E flujo de compra | DONE | purchase.spec.ts |

---

## Fase D — Etapa 2

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| D1 | Migraciones booking/calendar | DONE | |
| D2 | CRUD servicios + ubicaciones | DONE | |
| D3 | Availability rules/exceptions | DONE | |
| D4 | OAuth Google + tokens cifrados | DONE | /admin/calendario |
| D5 | Slot engine + FreeBusy | DONE | |
| D6 | Booking flow + holds | DONE | |
| D7 | Pago de reserva | DONE | MP o MANUAL |
| D8 | Sync eventos Calendar | DONE | SYNC_* statuses |
| D9 | Cancel / reschedule | DONE | |
| D10 | Admin agenda | DONE | |
| D11 | Tests concurrencia + sync | DONE | unit + e2e booking |

---

## Calidad / proceso

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| Q1 | Gate permanente docs + testing | DONE | Rule `10-docs-and-testing.mdc` alwaysApply; guide + tracker + roadmap |
| Q2 | Build Vercel sin DATABASE_URL en prerender | DONE | `force-dynamic` en layouts público/admin; heap 8GB en script build |
| Q3 | Separación presentation / full (`SITE_MODE`) | DONE | Gates servidor + docs GIT_WORKFLOW; Vercel dashboard pendiente (Etapa E) |
| Q4 | E2.1 prep presentation (CTA/contacto/logs) | DONE | Publicado `6994ec0` en `dev` |
| Q5 | E2.2 Supabase Postgres prep | DONE | Schema `DIRECT_URL`; seed seguro; docs; commit `9df83b7` |
| Q6 | E2.2.2 proyectos + docs refs | DONE | Refs `cfomrtrkhytmlwjwmfes` / `mhzijxwfvissdfgllwsk`; host pooler `aws-1-us-east-2` |
| Q7 | E2.2.3 migrate + seed remoto | TESTING | 2026-11-27: 3 migraciones + seed DEMO en presentation y preview; admins distintos; sin Vercel aún |

---

## Bloqueos activos

_Ninguno._ Pendiente: configurar variables en Vercel (Production → presentation, Preview → preview) y smoke deploy.

## Última actualización

2026-11-27: `prisma migrate deploy` + `db seed` OK en ambos Supabase. Local Docker intacto. Credenciales admin solo en archivos `.env.supabase.*.local` (gitignored).
