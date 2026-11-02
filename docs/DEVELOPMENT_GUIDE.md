# SER BRÚJULA — Development Guide

## Estado del repo

Fases **A** y **B** completas: docs, Cursor Rules, Next.js 15, Prisma (etapa 1), auth admin, tests base.

Antes de escribir código de producto, leé:

1. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [DATA_MODEL.md](./DATA_MODEL.md)
4. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
5. Reglas en `.cursor/rules/`

## Requisitos

- Node.js 20+
- pnpm
- Docker (Postgres: `docker compose up -d`, puerto **5434**)
- Cuentas futuras: Mercado Pago (test), Resend, storage S3, Google Cloud (etapa 2)

## Arranque

```bash
docker compose up -d
cp .env.example .env   # solo la primera vez
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Admin seed: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env`.

## Flujo de trabajo

1. Actualizar [TASK_TRACKER.md](./TASK_TRACKER.md) al empezar/terminar una tarea.
2. Lógica de negocio en `src/modules/*` (no en JSX de presentación).
3. Migraciones Prisma para todo cambio de schema.
4. Tests del flujo tocado (unit; E2E si es compra/reserva/pago).
5. No marcar COMPLETED en roadmap sin prueba.

## Variables de entorno

Fuente: [`.env.example`](../.env.example). Validación tipada en `src/lib/env.ts`.

## Convenciones

- TypeScript estricto; evitar `any`.
- Server Components por defecto; `"use client"` solo con justificación.
- Validación Zod en frontera servidor.
- Errores de dominio tipados (`src/lib/errors.ts`).
- Datos demo claramente marcados.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm test:e2e
pnpm lint
```

## Referencia visual YAMI

`/home/titin/Documentos/omegon/00-OMEGON/00-proyectos/YAMI/00 - codigo/front/yamila-velay-landing/` — solo craft visual. Ver [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Fases

| Fase | Estado |
|------|--------|
| A Docs + rules | Completa |
| B Scaffold técnico | Completa |
| C Etapa 1 ecommerce | Siguiente |
| D Etapa 2 reservas | Pendiente |
