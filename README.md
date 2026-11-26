# SER BRÚJULA

Plataforma digital de autoconocimiento y bienestar: **el cuerpo como brújula**.

## Estado

| Fase | Estado |
|------|--------|
| A Docs + Cursor Rules | Completa |
| B Fundación técnica | Completa |
| C Etapa 1 — web + ecommerce + admin | Completa (TESTING) |
| D Etapa 2 — reservas + Google Calendar | Completa (TESTING) |

## Arranque local

```bash
docker compose up -d
cp .env.example .env   # si aún no existe
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm exec next dev --turbopack -p 3000
```

- Sitio: http://127.0.0.1:3000  
- Reservas: `/reservas`  
- Admin: `/admin/login`  
- Agenda: `/admin/agenda` · Calendar: `/admin/calendario`

Credenciales seed: `SEED_ADMIN_*` en `.env` (default `admin@serbrujula.local` / `ChangeMeAdmin123!`).

## Pagos

- Con `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET`: Checkout Pro + webhook firmado (pedidos y reservas). **Sandbox verificado** (2026-11-26); ver `docs/INTEGRATIONS.md`.
- Sin token: modo **MANUAL de desarrollo** (pantallas explícitas / E2E). No usar en producción.
- El return URL **no** marca pagado/confirmado.
- Local con MP: `ngrok http 3000` y `NEXT_PUBLIC_APP_URL=https://…ngrok…` (no localhost).

## Google Calendar

Configurá en `.env`:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY` (mín. 16 caracteres)

Luego conectá desde `/admin/calendario`. Sin conexión, las reservas usan solo agenda local (`syncStatus = NONE`).

## Scripts

| Comando | Uso |
|---------|-----|
| `pnpm dev` | Desarrollo |
| `pnpm build` / `pnpm start` | Producción |
| `pnpm test` | Unit (Vitest) |
| `pnpm test:e2e` | E2E (compra + reserva) |
| `pnpm db:migrate` / `pnpm db:seed` | Base de datos |

## Documentación

Ver [`docs/`](docs/).
