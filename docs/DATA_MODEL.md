# SER BRÚJULA — Data Model

## Principios

- Entidades con reglas de negocio claras; evitar modelos excesivamente genéricos.
- Solo tablas justificadas por etapas activas o inminentes.
- Etapas 3–7: documentadas aquí, **sin migraciones** hasta su fase.
- Timestamps en UTC; presentación en `America/Argentina/Buenos_Aires`.
- Soft-delete o `isActive` donde el historial comercial importa (productos, pedidos).

## Alcance por etapa

| Dominio | Etapa 1 | Etapa 2 | Futuro |
|---------|---------|---------|--------|
| Identity | Sí | Sí | Extensión clientas |
| CMS | Sí | — | — |
| Ecommerce | Sí | — | — |
| Booking + Calendar | Diseño | Sí (migraciones) | — |
| Courses / Membership / Community / Training | Docs only | Docs only | Sí |

---

## Etapa 1 — Identity

### User

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| email | string | unique, required |
| emailVerifiedAt | datetime? | |
| passwordHash | string? | null si guest sin cuenta |
| role | enum | `ADMIN` \| `CUSTOMER` |
| createdAt / updatedAt | datetime | |

### AdminProfile

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| userId | uuid | unique FK → User |
| displayName | string | |

### CustomerProfile

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| userId | uuid? | nullable: guest sin cuenta |
| fullName | string | |
| phone | string? | |
| createdAt | datetime | |

Checkout guest crea o reutiliza perfil por email sin forzar login.

---

## Etapa 1 — CMS

### SiteContent

Contenidos editables por clave de sección (no un CMS genérico infinito).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| key | string | unique (`home.hero`, `about.philosophy`, `contact.email`, …) |
| type | enum | `TEXT` \| `RICHTEXT` \| `IMAGE` \| `JSON` |
| value | text/json | |
| updatedAt | datetime | |
| updatedById | uuid? | FK → User |

Claves iniciales acotadas a: home, about, services (informativo), contact, footer, brand.

### MediaAsset (opcional / compartido)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| url | string | |
| storageKey | string | |
| alt | string? | |
| mimeType | string | |
| width / height | int? | |

---

## Etapa 1 — Ecommerce

### ProductCategory

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| name | string | |
| slug | string | unique |
| description | string? | |
| sortOrder | int | default 0 |
| isActive | boolean | |

### Product

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| categoryId | uuid? | FK |
| name | string | |
| slug | string | unique |
| description | text | |
| priceCents | int | precio oficial (servidor) |
| currency | string | default `ARS` |
| isFeatured | boolean | |
| isActive | boolean | |
| createdAt / updatedAt | datetime | |

### ProductImage

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| productId | uuid | FK |
| assetId / url | | |
| sortOrder | int | |
| isPrimary | boolean | |

### Inventory

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| productId | uuid | unique FK |
| quantity | int | ≥ 0 |
| lowStockThreshold | int | default 5 |
| updatedAt | datetime | |

Stock se decrementa en transacción al confirmar pago (o al reservar stock en checkout, según política elegida en implementación: preferir **reserva al crear Order PENDING + confirmación en webhook**).

### Cart / CartItem

| Cart | | |
|------|--|--|
| id | uuid | |
| sessionToken | string? | guest |
| customerProfileId | uuid? | |
| expiresAt | datetime | |

| CartItem | | |
|----------|--|--|
| id | uuid | |
| cartId | uuid | |
| productId | uuid | |
| quantity | int | > 0 |
| unique(cartId, productId) | | |

### Order

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| orderNumber | string | unique, legible |
| customerProfileId | uuid | |
| email | string | snapshot |
| status | enum | ver abajo |
| subtotalCents | int | |
| shippingCents | int | |
| totalCents | int | calculado servidor |
| currency | string | |
| fulfillmentType | enum | `SHIPPING` \| `PICKUP` |
| shippingAddress | json? | |
| notes | text? | |
| createdAt / updatedAt | datetime | |

**Order.status:** `PENDING_PAYMENT` → `PAID` → `PREPARING` → `SHIPPED` / `READY_FOR_PICKUP` → `COMPLETED` \| `CANCELLED` \| `REFUNDED`.

### OrderItem

Snapshot de nombre, precio unitario y cantidad (no depender del producto vivo).

### OrderStatusHistory

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| orderId | uuid | |
| fromStatus | enum? | |
| toStatus | enum | |
| note | string? | |
| createdById | uuid? | |
| createdAt | datetime | |

### Payment

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| orderId | uuid | FK |
| provider | enum | `MERCADO_PAGO` \| `STRIPE` (futuro) \| `MANUAL` |
| providerPaymentId | string? | unique por provider |
| idempotencyKey | string | unique |
| status | enum | `PENDING` \| `APPROVED` \| `REJECTED` \| `REFUNDED` |
| amountCents | int | |
| rawPayload | json? | audit (sin secretos) |
| createdAt / updatedAt | datetime | |

### Shipment

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| orderId | uuid | unique |
| carrier | string? | |
| trackingCode | string? | |
| status | enum | `PENDING` \| `IN_TRANSIT` \| `DELIVERED` \| `PICKED_UP` |
| shippedAt / deliveredAt | datetime? | |

---

## Etapa 2 — Booking (diseño; migrar en Fase D)

### Service

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| name | string | |
| slug | string | unique |
| description | text | |
| durationMinutes | int | |
| bufferBeforeMinutes | int | preparación |
| bufferAfterMinutes | int | descanso |
| priceCents | int | |
| currency | string | `ARS` |
| modalities | enum[] | `CONSULTORIO` \| `DOMICILIO` |
| isActive | boolean | |

### ServiceLocation

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| type | enum | `CONSULTORIO` \| `DOMICILIO` |
| name | string | |
| address | string? | consultorio |
| coverageNotes | text? | domicilio |
| travelBufferMinutes | int | default 0; domicilio |
| isActive | boolean | |

### AvailabilityRule

Reglas semanales por ubicación (no asumir mismos horarios consultorio/domicilio).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| locationId | uuid | |
| dayOfWeek | int | 0–6 |
| startTimeLocal | string | `HH:mm` en TZ negocio |
| endTimeLocal | string | |
| timezone | string | `America/Argentina/Buenos_Aires` |

### AvailabilityException

Vacaciones, feriados, bloqueos, horarios especiales.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| locationId | uuid? | null = global |
| startsAt | datetime | UTC |
| endsAt | datetime | UTC |
| type | enum | `BLOCK` \| `CUSTOM_OPEN` |
| note | string? | |

### BookingHold

Bloqueo temporal de slot durante checkout (anti-doble reserva).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| serviceId | uuid | |
| locationId | uuid | |
| startsAt / endsAt | datetime | UTC (incluye buffers) |
| expiresAt | datetime | |
| sessionToken | string | |

### Booking

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| serviceId | uuid | |
| locationId | uuid | |
| customerProfileId | uuid | |
| startsAt / endsAt | datetime | UTC sesión (sin buffers en display; buffers en ocupación) |
| status | enum | `PENDING_PAYMENT` \| `CONFIRMED` \| `CANCELLED` \| `RESCHEDULED` |
| syncStatus | enum | `NONE` \| `SYNC_PENDING` \| `SYNCED` \| `SYNC_FAILED` |
| priceCents | int | snapshot |
| paymentId | uuid? | |
| notes | text? | |
| cancelledAt | datetime? | |
| rescheduledFromId | uuid? | |

Índice/restricción: evitar solapes de bookings `CONFIRMED`/`PENDING_PAYMENT` activos en el mismo recurso (profesional única) mediante validación transaccional + holds.

### CalendarConnection

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| adminUserId | uuid | |
| googleAccountEmail | string | |
| accessTokenEnc | string | cifrado |
| refreshTokenEnc | string | cifrado |
| tokenExpiresAt | datetime | |
| calendarId | string | seleccionado |
| scopes | string | mínimos |

### CalendarEvent

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| bookingId | uuid | unique |
| connectionId | uuid | |
| googleEventId | string | |
| lastSyncedAt | datetime | |
| lastError | string? | |

---

## Futuro (solo documentación)

No crear tablas ahora.

- **Courses:** Course, CourseModule, Lesson, Enrollment, Progress.
- **Membership:** MembershipPlan, Subscription, Entitlement.
- **Community:** CommunitySpace, CommunityEvent, CommunityEnrollment.
- **Training:** TrainingProgram, TrainingModule, TrainingEnrollment.

Cuando se implementen, reutilizarán `User`/`CustomerProfile` y `Payment`.

---

## Diagrama ER (etapas 1–2)

```text
User ──┬── AdminProfile
       └── CustomerProfile

ProductCategory ──< Product ──┬── ProductImage
                              └── Inventory

Cart ──< CartItem >── Product

Order ──┬── OrderItem
        ├── OrderStatusHistory
        ├── Payment
        └── Shipment

Service ──< Booking ── CalendarEvent ── CalendarConnection
ServiceLocation ──< AvailabilityRule
                ──< AvailabilityException
BookingHold (temporal)
SiteContent / MediaAsset
```
