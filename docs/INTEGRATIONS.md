# SER BRÚJULA — Integrations

## Resumen

| Integración | Etapa | Propósito |
|-------------|-------|-----------|
| Mercado Pago | 1 (+2) | Pagos ecommerce y reservas |
| Resend | 1 (+2) | Correo transaccional y contacto |
| S3-compatible | 1 | Imágenes productos y CMS |
| Google Calendar | 2 | Disponibilidad y eventos de reserva |
| Stripe | Futuro | Adapter opcional de pagos |

Todas las credenciales van en variables de entorno. Nunca en el cliente ni en el repo.

---

## Mercado Pago

**Estado (2026-11-26):** Checkout Pro + webhook firmado + validaciones + tests unitarios. **Sandbox verificado** (compra real Test vía ngrok): Payment `APPROVED`, Order `PAID`, stock descontado una vez, webhook moderno (`data.id` + `type=payment`) con firma válida → 200. C8 → DONE. Etapa 1 sigue en `TESTING` (otros criterios / E2E MANUAL a revalidar). El E2E CI (`tests/e2e/purchase.spec.ts`) cubre solo el proveedor `MANUAL` (ejecutar sin `MERCADOPAGO_ACCESS_TOKEN`).

### Evidencia sandbox (sin PII ni secretos)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-26 (UTC) |
| Entorno | Test / Checkout Pro |
| Pedido ejemplo | `SB-20261126-CCSKE2` |
| Payment | `APPROVED` · `providerPaymentId` y `providerCheckoutId` persistidos |
| Order | `PAID` · historial `PENDING_PAYMENT` → `PAID` |
| Importe | `amountCents` local = MP `transaction_amount` × 100 · moneda `ARS` |
| `external_reference` | = `Order.id` |
| Webhook | `POST ...?data.id=…&type=payment` → 200 + `payment.approved` |
| Firma | `WebhookSignatureValidator` activo; notificaciones legacy `?id=&topic=` pueden devolver 401 (manifest usa `data.id`) |
| Correo | Intentado; en local sin `RESEND_API_KEY` → `mail.skipped_no_api_key` sin PII (pedido ya confirmado) |

SDK: `mercadopago@3.6.1` (`Preference`, `Payment`, `WebhookSignatureValidator`).

### Uso

- **Checkout Pro**: `MercadoPagoProvider.createCheckout` crea una preferencia (`Preference.create` + `requestOptions.idempotencyKey`) y redirige a `init_point` / `sandbox_init_point`.
- Adapter `PaymentProvider`. Selección: si hay `MERCADOPAGO_ACCESS_TOKEN` → MP (**exige** `MERCADOPAGO_WEBHOOK_SECRET`); si no → `ManualPaymentProvider` (dev/E2E).
- Confirmación `PAID` / reserva `CONFIRMED`: solo vía webhook verificado (o simulación MANUAL). El return URL **no** marca pagado.

### Flujo ecommerce

1. `checkoutAction` crea Order + Payment (`PENDING`) **sin** vaciar el carrito.
2. `createCheckout` → preferencia MP; se persiste `Payment.providerCheckoutId`.
3. Solo si la preferencia OK → `clearCart` + redirect a MP.
4. Si la preferencia falla → Order `CANCELLED`, Payment `REJECTED`, **carrito intacto**.
5. Comprador vuelve a `/pedido/{orderNumber}?status=return|failure|pending` (solo UI).
6. MP notifica `POST` `/api/webhooks/mercadopago` (firmado).
7. Firma → `Payment.get` → validación importe/moneda/`external_reference` → estados.

Reservas reutilizan el mismo provider (`submitBookingAction`); `external_reference` = **booking id**. Si falla la preferencia, la reserva se cancela (compensación).

### Mapa de estados (webhook)

| Estado MP | Payment | Order / Booking |
|-----------|---------|-----------------|
| `approved` | APPROVED | Order PAID / Booking CONFIRMED (+ stock atómico en orders) |
| `pending` / `in_process` | PENDING | PENDING_PAYMENT (no cancela) |
| `rejected` / `cancelled` | REJECTED | CANCELLED |
| `refunded` | REFUNDED | Order REFUNDED / Booking CANCELLED |

Mismatch de importe o moneda en `approved`: **no confirma**; responde **200**; deja `rawPayload.investigation = AMOUNT_OR_CURRENCY_MISMATCH` y log de alerta (sin secretos).

### Seguridad del webhook

- Solo **POST** firmado. **GET → 405** (IPN legacy no confirma pagos).
- `WebhookSignatureValidator.validate` con `x-signature`, `x-request-id`, `data.id`, secret, `toleranceSeconds: 300`.
- Firma ausente/inválida → **401**.
- Idempotencia: `SELECT … FOR UPDATE` + `updateMany` condicional; stock con `quantity >= n` (nunca negativo ni doble descuento).
- Logs: sin access tokens, secretos ni firmas completas.

### Endpoints

| Rol | Ruta | Notas |
|-----|------|-------|
| Crear preferencia | Server Action | `checkoutAction` / `submitBookingAction` |
| Webhook MP | `POST /api/webhooks/mercadopago` | `notification_url` = `{NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago` |
| GET webhook | 405 | No soportado |
| Retorno | `/pedido/[orderNumber]`, `/reserva/[bookingNumber]` | query `status` |
| Simulación dev | `/pedido/.../pagar`, `/api/webhooks/manual-payment` | deshabilitado si hay token MP |

### Variables

```bash
MERCADOPAGO_ACCESS_TOKEN=          # servidor; vacío = modo MANUAL. Test: credencial del panel en modo Test
MERCADOPAGO_WEBHOOK_SECRET=        # obligatorio si hay access token (Secret signature del panel)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY= # opcional; Checkout Pro por redirect no la usa
NEXT_PUBLIC_APP_URL=               # HTTPS público (ngrok en local) para back_urls + notification_url
MANUAL_PAYMENT_SECRET=             # solo modo MANUAL
```

Sandbox vs producción: mismo nombre de variable; cambia el valor (credenciales Test vs Production del panel). El SDK elige `init_point` o `sandbox_init_point`.

### Local con ngrok (puerto 3000)

`localhost` no sirve para `notification_url` ni `back_urls` de MP.

```bash
docker compose up -d
pnpm db:migrate   # o db:deploy
pnpm exec next dev --turbopack -p 3000

# Otra terminal
ngrok http 3000
# → https://xxxx.ngrok-free.app
```

En `.env` (reiniciar Next tras cambiar):

```bash
NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app
MERCADOPAGO_ACCESS_TOKEN=<credencial Test del panel>
MERCADOPAGO_WEBHOOK_SECRET=<Secret signature Webhooks Test>
```

En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) (modo **Test**):

1. Credenciales Test → Access Token.
2. Webhooks → URL de prueba: `https://xxxx.ngrok-free.app/api/webhooks/mercadopago`, evento **Payments**.
3. Copiar Secret signature → `MERCADOPAGO_WEBHOOK_SECRET`.

Cuando cambie la URL de ngrok: actualizar `NEXT_PUBLIC_APP_URL` y la URL de prueba del panel (o confiar en `notification_url` por preferencia, que tiene precedencia).

Compra de prueba: cuenta compradora Test + [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards) oficiales. Verificar pedido `PAID` en admin y stock.

Para E2E CI: dejar `MERCADOPAGO_ACCESS_TOKEN` vacío (modo MANUAL).

### Tests automatizados

Vitest con mocks del SDK (sin red ni credenciales reales):

- `tests/unit/payments/mercadopago-provider.test.ts`
- `tests/unit/payments/apply-webhook-event.test.ts`
- `tests/unit/payments/webhook-route.test.ts`
- `tests/unit/payments/get-provider.test.ts`
- `tests/unit/orders/confirm-payment.test.ts`
- `tests/unit/checkout/abandon-checkout.test.ts`

Documentación oficial de Mercado Pago es la fuente de verdad para firma y credenciales.

---

## Resend

### Uso

- Confirmación de pedido.
- Formulario de contacto (notificación a admin + acuse a visitante).
- Etapa 2: confirmación / cancelación / reprogramación de reservas.

### Contacto — comportamiento

- Éxito solo si `RESEND_API_KEY` está configurada **y** Resend acepta el envío a admin + acuse al visitante.
- Sin API key o sin destinatario admin (`EMAIL_ADMIN_TO` / `SEED_ADMIN_EMAIL`): el formulario **no** muestra éxito; informa que el envío por email no está disponible. Si el CMS tiene `contact.email`, esa dirección ya se muestra en `/contacto` como canal alternativo (no se inventan datos).
- Error de Resend: mensaje genérico al usuario (sin detalles técnicos ni secretos).
- Pedidos/reservas: si falta la API key se registra `mail.skipped_no_api_key` y el flujo comercial **no** se revierte (el pago/reserva ya está confirmado).

### Privacidad de logs

Los logs de mail solo incluyen `kind` (p. ej. `contact_admin`) y `status` (`sent` | `skipped` | `failed`). **No** se registran destinatarios, asuntos, HTML ni cuerpos. El logger también redacta campos sensibles (`to`, `email`, `subject`, `html`, `message`, tokens, api keys).

### Variables

```bash
RESEND_API_KEY=
EMAIL_FROM="Ser Brújula <noreply@dominio.com>"
EMAIL_ADMIN_TO=
```

---

## Storage S3-compatible

### Uso

- Fotos de producto.
- Imágenes de contenidos CMS.
- Uploads desde admin con **URL firmada** (PUT) o upload vía Route Handler autenticado.

### Variables

```bash
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

Proveedores posibles: Cloudflare R2, AWS S3, MinIO local en desarrollo.

---

## Google Calendar (etapa 2)

### Flujo OAuth (admin)

1. Admin inicia “Conectar Google Calendar”.
2. Consent OAuth 2.0 (servidor).
3. Guardar tokens **cifrados** en `CalendarConnection`.
4. Seleccionar `calendarId` a usar para reservas.
5. Refresh de access token en servidor cuando expire.

### Scopes

Mínimos necesarios para:

- Consultar ocupación (**FreeBusy**).
- Crear / actualizar / eliminar eventos de reservas.

Evitar scopes de lectura total de Gmail u otros productos.

### Disponibilidad

Antes de ofrecer un slot:

1. Reglas locales + excepciones + buffers del servicio.
2. Bookings y holds activos en DB.
3. FreeBusy del calendario conectado (eventos personales también bloquean).

### Eventos

Al confirmar reserva: crear evento, guardar `googleEventId`. Título/descripción sin PII innecesaria. Cancelar/reprogramar sincroniza el evento. Si Google falla → `syncStatus = SYNC_FAILED` / `SYNC_PENDING`, nunca fingir `SYNCED`.

### Variables

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
TOKEN_ENCRYPTION_KEY=
```

---

## Stripe (futuro)

Implementar como segundo `PaymentProvider` sin cambiar el dominio de Order/Payment. No configurar hasta que el negocio lo requiera y la disponibilidad lo permita.

---

## Supabase PostgreSQL

**Rol:** solo Postgres managed. Auth sigue en **Auth.js**. No integrar Supabase Auth ni exponer `service_role` / anon keys al cliente para esta etapa.

### Arquitectura de conexiones

```
Vercel Production (main, presentation)
  └─ DATABASE_URL → serbrujula-presentation (pooler :6543?pgbouncer=true)
  └─ migrate/seed (manual/CI) → DIRECT_URL presentation (direct o session :5432)

Vercel Preview (dev, full)
  └─ DATABASE_URL → serbrujula-preview (pooler :6543?pgbouncer=true)
  └─ migrate/seed → DIRECT_URL preview

Local
  └─ DATABASE_URL = DIRECT_URL → Docker :5434  (o preview, si se configura explícitamente)
```

Prisma schema (`prisma/schema.prisma`): `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.  
Runtime: Prisma Client clásico (sin driver adapter). Migraciones: `pnpm db:deploy` (`prisma migrate deploy`) **siempre** contra `DIRECT_URL`.

### Crear proyectos (manual — pendiente de ejecución)

1. Cuenta Supabase → Create project **`serbrujula-presentation`** (región cercana a Vercel `gru1`, p. ej. South America si está disponible).
2. Create project **`serbrujula-preview`** (misma región preferible; **otro** password de DB).
3. En cada uno: Project Settings → Database → Connection string:
   - **Transaction** (port 6543) → `DATABASE_URL` + `?pgbouncer=true` (+ `sslmode=require` si no viene).
   - **Direct** o **Session** (port 5432) → `DIRECT_URL`.
4. Guardar passwords en gestor de secretos; **nunca** en Git.
5. Aún no cablear Vercel hasta aprobación E2.3+.

### Migraciones

Orden en repo (SQL puro Postgres, sin extensiones locales):

1. `20261030182957_init_etapa1`
2. `20261030190000_booking_calendar_etapa2`
3. `20261126180000_payment_provider_checkout_id`

```bash
# Con DIRECT_URL del proyecto destino (presentation o preview):
pnpm db:deploy
```

No usar `migrate dev` contra Supabase remoto en CI/deploy.

### Seed DEMO

```bash
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD='…≥12…' SEED_ADMIN_NAME=... pnpm db:seed
```

- Obliga email/password vía env; rechaza defaults tipo `ChangeMeAdmin123!`.
- Productos/servicios marcados `[DEMO]`; CMS suficiente para home/sobre/servicios/contacto/tienda.
- Idempotente (upserts). **Limitación:** re-ejecutar sobrescribe keys CMS listadas, stock/descripciones DEMO y reglas de las ubicaciones seed. No borra Orders/Bookings/clientes ajenos.
- No usar datos personales reales.

### Backups y recuperación

- Activar backups automáticos del plan Supabase (Free: limitaciones; Pro: PITR según plan).
- Recuperación: restaurar backup en el **mismo** proyecto o crear proyecto nuevo y re-apuntar env Vercel; luego `db:deploy` si el schema quedó atrás + seed DEMO si es presentation vacía.
- Nunca restaurar un dump de preview sobre presentation (ni viceversa).

### Costes / límites a verificar antes del plan

- Free: proyectos pausados por inactividad, límites de storage/egress, posible add-on IPv4 para direct connection.
- Connection pooling (Supavisor) incluido; preferir pooler en Vercel serverless.
- Confirmar región, cuota de dos proyectos y precio Pro si se necesita uptime continuo para presentation.

### Checklist conectar Supabase ↔ Vercel

- [ ] Dos proyectos creados (presentation ≠ preview).
- [ ] `DATABASE_URL` + `DIRECT_URL` por entorno, sin mezclar.
- [ ] `pnpm db:deploy` + seed DEMO en cada DB (con passwords fuertes).
- [ ] Vercel Production: env presentation + `SITE_MODE=presentation`.
- [ ] Vercel Preview: env preview + `SITE_MODE=full`.
- [ ] Auth.js `AUTH_SECRET` distinto por entorno; sin Supabase Auth.
- [ ] Smoke: home/tienda/admin; webhook MP → 403 en presentation.
- [ ] Sin `service_role` en frontend; sin connection strings en repo.

---

## Checklist de seguridad de integraciones

- [x] Secretos solo en env / secret manager.
- [x] `.env.example` actualizado sin valores reales.
- [x] Webhooks autenticados y idempotentes (MP: firma + claim atómico).
- [x] Tokens OAuth cifrados en reposo.
- [x] Logs sin access tokens ni datos de tarjeta.
- [x] Timezone de negocio fija: `America/Argentina/Buenos_Aires`.
- [x] Contacto/Resend sin falso éxito; logs mail sin PII (E2.1).
- [x] Postgres: presentation ≠ preview; Prisma `DATABASE_URL` + `DIRECT_URL` (E2.2).
