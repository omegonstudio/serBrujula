# SER BRÚJULA — Development Guide

## Estado del repo

| Fase | Contenido | Estado |
|------|-----------|--------|
| A | Docs + Cursor Rules | Completa |
| B | Next.js, Prisma, auth admin, tests base | Completa |
| C | Etapa 1 — web + ecommerce + admin | Completa (TESTING en roadmap) |
| D | Etapa 2 — reservas + Google Calendar | Completa (TESTING en roadmap) |

Antes de escribir código de producto, leé:

1. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [DATA_MODEL.md](./DATA_MODEL.md)
4. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
5. Reglas en `.cursor/rules/` (en especial `10-docs-and-testing.mdc`)

## Requisitos

- Node.js 20+
- pnpm
- Docker (Postgres: `docker compose up -d`, puerto **5434**)
- Integraciones: Mercado Pago, Resend, storage S3, Google Cloud (Calendar)

## Arranque

```bash
docker compose up -d
cp .env.example .env   # solo la primera vez
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm exec next dev --turbopack -p 3001
```

Admin seed: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env`.

## Flujo de trabajo

1. Actualizar [TASK_TRACKER.md](./TASK_TRACKER.md) al empezar/terminar.
2. Lógica de negocio en `src/modules/*` (no en JSX de presentación).
3. Migraciones Prisma para todo cambio de schema.
4. Tests del cambio (unit / integration / E2E según tipo).
5. Cumplir el **gate de cierre** (abajo). No marcar COMPLETED sin pruebas **ejecutadas**.

## Gate de cierre (obligatorio)

Una tarea solo puede marcarse DONE / COMPLETED cuando:

- [ ] Implementación terminada
- [ ] Validaciones implementadas
- [ ] Tests correspondientes creados
- [ ] Tests ejecutados correctamente
- [ ] Regresiones verificadas (módulos afectados)
- [ ] Lint/build correctos si hubo cambios en `src/`
- [ ] Documentación afectada actualizada
- [ ] `TASK_TRACKER.md` actualizado
- [ ] `ROADMAP.md` actualizado cuando corresponda

Si falta algo: dejar `TESTING`, `IN_PROGRESS` o `BLOCKED`.  
Nunca cerrar solo porque “se ve bien” o pasó una prueba manual aislada.

### Matriz cambio → documentación

| Cambio | Documento |
|--------|-----------|
| Base de datos / entidades | [DATA_MODEL.md](./DATA_MODEL.md) |
| Arquitectura / módulos | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| MP, Google, Resend, S3 | [INTEGRATIONS.md](./INTEGRATIONS.md) |
| UI / tokens / craft | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) |
| Alcance o estado de etapa | [ROADMAP.md](./ROADMAP.md) |
| Progreso de tareas | [TASK_TRACKER.md](./TASK_TRACKER.md) |
| Proceso / arranque / gates | Este archivo |
| Visión / principios | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) |

No hace falta tocar todos los docs en cada tarea: sí revisar cuáles aplican.

### Resumen final obligatorio (al cerrar)

1. Qué se implementó  
2. Qué archivos se modificaron  
3. Qué tests se agregaron  
4. Qué tests se ejecutaron  
5. Resultado de los tests  
6. Resultado del build (o N/A si no hubo cambios en `src/`)  
7. Qué documentación se actualizó  
8. Qué tareas quedan pendientes  

No afirmar que un test pasó si no se ejecutó.

## Testing

### Tipos

- **Unit:** reglas, cálculos, validaciones, slots, precios, estados.
- **Integration:** Prisma, transacciones, webhooks, pagos, Calendar, mail, storage (con mocks).
- **E2E:** compra; reserva → pago → confirmación; flujos admin críticos.

### Integraciones externas

Mockear Mercado Pago, Google Calendar, Resend y S3. Cubrir éxito y fallo.  
Sin credenciales reales en tests. Preferir helpers/mocks bajo `tests/`.

### Comandos de verificación

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```

## Variables de entorno

Fuente: [`.env.example`](../.env.example). Validación tipada en `src/lib/env.ts`.

## Convenciones

- TypeScript estricto; evitar `any`.
- Server Components por defecto; `"use client"` solo con justificación.
- Validación Zod en frontera servidor.
- Errores de dominio tipados (`src/lib/errors.ts`).
- Datos demo claramente marcados.

## Referencia visual YAMI

`/home/titin/Documentos/omegon/00-OMEGON/00-proyectos/YAMI/00 - codigo/front/yamila-velay-landing/` — solo craft visual. Ver [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
