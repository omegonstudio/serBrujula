# SER BRÚJULA — Git workflow

## Ramas

| Rama | Propósito |
|------|-----------|
| `dev` | Desarrollo completo y activo (ecommerce, MP, reservas, Calendar, tests). |
| `main` | Presentación estable en Vercel Production (`NEXT_PUBLIC_SITE_MODE=presentation`). |
| `feature/*` | Trabajo aislado desde `dev`; Preview Deployments. |

Misma codebase en `main` y `dev`. La diferencia operativa es **configuración de entorno**, no forks de producto.

## Flujo de desarrollo

1. Partir de `dev` actualizado: `git checkout dev && git pull`.
2. Crear feature: `git checkout -b feature/nombre-corto`.
3. Commits pequeños; tests del módulo tocado.
4. Abrir PR hacia **`dev`** (no hacia `main`).
5. Tras merge a `dev`, Vercel Preview debe construir con env Preview (`SITE_MODE=full` o sin setear).

## Integrar a presentación (`main`)

1. `dev` estable (lint/test/build OK).
2. PR explícito `dev` → `main` (o merge local + push). **No** auto-promover cada commit de `dev`.
3. En Vercel Production: `NEXT_PUBLIC_SITE_MODE=presentation`, DB de **presentación** (no la de desarrollo), sin `MERCADOPAGO_*` / Resend / Google obligatorios.

## Producción con cobros reales

Cuando el cliente apruebe y la validación técnica cierre:

1. Tests + checklist de seguridad.
2. Credenciales **Production** (MP, Resend, Calendar) en un entorno dedicado.
3. Postgres de **producción** (migraciones `pnpm db:deploy`).
4. `NEXT_PUBLIC_SITE_MODE=full` (o env equivalente sin presentation).
5. Deploy controlado; no publicar automáticamente desde `dev`.

## Modo presentation (seguridad)

- UI: oculta Reservas en nav, deshabilita formulario de checkout, carrito sin cobro.
- **Servidor:** `assertCommerceEnabled()` bloquea:
  - `checkoutAction` / `createOrderFromCart`
  - `MercadoPagoProvider.createCheckout` / `ManualPaymentProvider`
  - pagos manuales y webhooks manuales
  - `submitBookingAction` / confirm manual de reserva
  - `adminCreateBookingAction`
  - `POST /api/webhooks/mercadopago` → **403** sin procesar
- No simula transacciones aprobadas.

## Bases de datos

| Ambiente | Uso |
|----------|-----|
| Desarrollo local | Docker Postgres (`DATABASE_URL` = `DIRECT_URL` local) u opcionalmente Supabase preview. |
| Presentación (Vercel Production) | Supabase **`serbrujula-presentation`** (pooler runtime + direct migrate). |
| Preview full (`dev`) | Supabase **`serbrujula-preview`** (distinto; no compartir con presentation). |
| Producción real (cobros) | Postgres managed **prod** futuro; nunca mezclar con demo/dev. |

## Conflictos

1. Actualizar `dev`.
2. Rebase o merge de la feature; resolver archivo por archivo (no ours/theirs a ciegas).
3. Cuidado especial: `package.json`/lockfile, `prisma/schema.prisma`, `prisma/migrations/`, `.env.example`, `next.config.*`, `vercel.json`.
4. **No** borrar migraciones para “arreglar” Git.

## Build fallido

1. Reproducir local: `pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build`.
2. Probar ambos modos: `NEXT_PUBLIC_SITE_MODE=presentation pnpm build` y `full`.
3. Revisar env (`DATABASE_URL`, `AUTH_SECRET`, heap en script build).
4. No force-push ni `--no-verify` salvo acuerdo explícito.

## Prohibido sin aprobación

`git reset --hard`, `git push --force` / `--force-with-lease`, `git clean -fd`, borrar ramas remotas, reescribir historial compartido.

## Vercel (checklist manual)

| Ítem | Valor |
|------|--------|
| Framework | Next.js |
| Node | 20+ |
| Install | `pnpm install` |
| Build | `pnpm build` |
| Production Branch | `main` |
| Preview | `dev`, `feature/*` |
| Env Production | `NEXT_PUBLIC_SITE_MODE=presentation` + DB demo |
| Env Preview | `NEXT_PUBLIC_SITE_MODE=full` + DB desarrollo |
