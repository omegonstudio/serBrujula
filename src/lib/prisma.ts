import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// #region agent log
(() => {
  const raw = process.env.DATABASE_URL ?? "";
  let host: string | null = null;
  let port: string | null = null;
  let db: string | null = null;
  try {
    const u = new URL(raw);
    host = u.hostname || null;
    port = u.port || null;
    db = u.pathname.replace(/^\//, "") || null;
  } catch {
    /* ignore parse errors */
  }
  fetch("http://127.0.0.1:7505/ingest/cb0fb76d-7e65-48eb-89dd-50a1cb7db979", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "016f28",
    },
    body: JSON.stringify({
      sessionId: "016f28",
      runId: "post-fix",
      hypothesisId: "B,D",
      location: "src/lib/prisma.ts:init",
      message: "Prisma client init env snapshot",
      data: {
        hasDatabaseUrl: Boolean(raw),
        host,
        port,
        db,
        nodeEnv: process.env.NODE_ENV ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
})();
// #endregion

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
