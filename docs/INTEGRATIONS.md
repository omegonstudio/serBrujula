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

### Uso

- **Checkout Pro** (preferido en etapa 1): crear preferencia en servidor, redirigir a MP, confirmar vía **webhook/IPN verificado**.
- Adapter `PaymentProvider` para no acoplar el dominio a MP.

### Reglas

- Access token solo servidor.
- Totales calculados en servidor a partir de DB (no precios del frontend).
- El return URL del comprador **no** marca el pedido como pagado.
- Webhooks: verificar firma/autenticidad; idempotencia por `providerPaymentId` / `idempotencyKey`.
- Reintentos de notificación no deben duplicar pedidos ni decrementar stock dos veces.

### Variables (ejemplo)

```bash
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MERCADOPAGO_PUBLIC_KEY=          # solo si el frontend necesita SDK público
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
```

Documentación oficial de Mercado Pago es la fuente de verdad para endpoints y verificación.

---

## Resend

### Uso

- Confirmación de pedido.
- Formulario de contacto (notificación a admin + acuse a visitante).
- Etapa 2: confirmación / cancelación / reprogramación de reservas.

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

## Checklist de seguridad de integraciones

- [ ] Secretos solo en env / secret manager.
- [ ] `.env.example` actualizado sin valores reales.
- [ ] Webhooks autenticados y idempotentes.
- [ ] Tokens OAuth cifrados en reposo.
- [ ] Logs sin access tokens ni datos de tarjeta.
- [ ] Timezone de negocio fija: `America/Argentina/Buenos_Aires`.
