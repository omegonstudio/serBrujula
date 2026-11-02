# SER BRÚJULA — Architecture

## Decisión principal

**Monolito modular en Next.js (App Router) + TypeScript.**

Un solo deployable. Separación de responsabilidades por módulos de dominio, no por microservicios. Next.js cubre UI, Server Actions, Route Handlers y lógica de servidor de forma segura, sin API Node independiente.

## Stack

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Framework | Next.js 15 App Router | RSC, Server Actions, Route Handlers, un solo runtime |
| UI | React + TypeScript estricto + Tailwind CSS | Tipado, Server Components por defecto, estilos útiles |
| ORM / DB | Prisma + PostgreSQL | Migraciones, integridad, tipado para ecommerce y reservas |
| Auth admin | Auth.js (NextAuth) credentials | Simple en etapa 1; roles listos para cuentas de clientas después |
| Pagos | Mercado Pago Checkout Pro + `PaymentProvider` | Argentina primero; Stripe como adapter futuro |
| Correo | Resend | Transaccional simple |
| Media | S3-compatible (R2/S3) + signed uploads | Productos y CMS |
| Calendar | Google Calendar API + OAuth 2.0 | Etapa 2 |
| Deploy | Vercel + Postgres managed (Neon/Supabase) | Alineado a Next; envs dev/prod |
| Tests | Vitest + Playwright | Unit/integration + E2E de flujos críticos |

## Diagrama de capas

```text
┌─────────────────────────────────────────────┐
│  Sitio público          Panel admin         │
│  (App Router)           (App Router)        │
└─────────────┬─────────────────┬─────────────┘
              │                 │
              ▼                 ▼
┌─────────────────────────────────────────────┐
│  Server Actions / Route Handlers            │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│  Modules (domain / application / infra)     │
│  catalog · cart · checkout · orders ·       │
│  payments · cms · identity · booking ·      │
│  calendar · notifications                   │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│  Prisma → PostgreSQL                        │
│  Shared: auth, payments, mail, storage, TZ  │
└─────────────────────────────────────────────┘
```

## Estructura de carpetas

```text
/
├── .cursor/rules/
├── docs/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/          # inicio, sobre, servicios, tienda, contacto
│   │   ├── (admin)/admin/     # dashboard, productos, pedidos, contenidos
│   │   ├── api/               # webhooks MP, OAuth Google, health
│   │   └── layout.tsx
│   ├── components/            # design system UI
│   ├── modules/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── cms/
│   │   ├── booking/           # etapa 2
│   │   ├── calendar/          # etapa 2
│   │   ├── identity/
│   │   └── notifications/
│   ├── lib/                   # prisma, env, logger, errors, timezone
│   └── styles/
├── tests/
├── .env.example
└── package.json
```

Cada módulo puede organizarse internamente así (ligero, sin capas vacías):

```text
modules/<name>/
  domain/          # tipos, reglas, invariantes
  application/     # casos de uso
  infrastructure/  # prisma, APIs externas
  ui/              # componentes del módulo (si aplica)
```

## Áreas funcionales

### A. Sitio público

Rutas habilitadas según etapa. Etapa 1: Inicio, Sobre, Servicios (informativo), Tienda, Contacto. No mostrar módulos futuros como disponibles.

### B. Administración

Panel para no-técnicos. Etapa 1: dashboard, productos, categorías, inventario, pedidos, contenidos, contacto. Etapa 2: servicios, disponibilidad, agenda, Google Calendar. Estructura de menú preparada para módulos futuros sin implementarlos.

### C. Área privada de clientas

Arquitectura de `User` + roles desde el inicio. Etapas 1–2: checkout y reserva como guest (email + datos). Cuentas personales en etapas posteriores.

## Pagos: adapter pattern

```text
PaymentProvider
  ├── createCheckout(order) → redirectUrl
  ├── verifyWebhook(request) → PaymentEvent
  └── getPaymentStatus(externalId)

MercadoPagoProvider  (etapa 1)
StripeProvider       (futuro, si aplica)
```

Reglas: precios y totales solo en servidor; confirmación de pago solo por webhook verificado; redirect del usuario no marca `PAID`.

## Reservas y calendario (etapa 2, diseñado ya)

- Disponibilidad local (reglas, excepciones, bookings, holds) + FreeBusy de Google.
- TZ canónica: `America/Argentina/Buenos_Aires`. Timestamps en UTC.
- Booking status y sync status son ejes separados (ver DATA_MODEL).
- Si Google falla, no se marca `SYNCED`.

## Feature flags / habilitación

Habilitar módulos por configuración (rutas públicas, ítems de nav, menú admin). Etapas 3–7 no generan tablas ni UI hasta su fase.

## Qué evitamos

- Microservicios.
- Backend Node separado “por si acaso”.
- CMS headless externo en etapa 1 (contenidos en Postgres + admin propio).
- Copiar arquitectura de YAMI (Vite + Strapi + Calendly).
- Tablas vacías de dominios futuros.

## Ambientes

| Ambiente | Uso |
|----------|-----|
| `development` | Local; seed de demo claramente marcado |
| `production` | Datos reales; sin mocks presentados como reales |

Secretos solo en variables de entorno. `.env.example` sin valores reales.
