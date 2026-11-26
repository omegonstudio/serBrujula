import { prisma } from "@/lib/prisma";

// #region agent log
function debugCmsLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  fetch("http://127.0.0.1:7505/ingest/cb0fb76d-7e65-48eb-89dd-50a1cb7db979", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "016f28",
    },
    body: JSON.stringify({
      sessionId: "016f28",
      runId: "post-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

export async function getContent(key: string, fallback = ""): Promise<string> {
  // #region agent log
  debugCmsLog("A,B,E", "content.ts:getContent:before", "getContent before query", {
    key,
  });
  // #endregion
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    // #region agent log
    debugCmsLog("A,E", "content.ts:getContent:ok", "getContent query ok", {
      key,
      found: Boolean(row),
    });
    // #endregion
    return row?.value ?? fallback;
  } catch (error) {
    // #region agent log
    const err = error as { name?: string; message?: string; code?: string };
    debugCmsLog("A,B,C,E", "content.ts:getContent:error", "getContent query failed", {
      key,
      name: err?.name ?? null,
      code: err?.code ?? null,
      message: String(err?.message ?? error).slice(0, 240),
    });
    // #endregion
    throw error;
  }
}

export async function getContentMap(keys: string[]): Promise<Record<string, string>> {
  // #region agent log
  debugCmsLog("A,B,E", "content.ts:getContentMap:before", "getContentMap before query", {
    keyCount: keys.length,
  });
  // #endregion
  try {
    const rows = await prisma.siteContent.findMany({
      where: { key: { in: keys } },
    });
    // #region agent log
    debugCmsLog("A,E", "content.ts:getContentMap:ok", "getContentMap query ok", {
      rowCount: rows.length,
    });
    // #endregion
    const map: Record<string, string> = {};
    for (const key of keys) map[key] = "";
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch (error) {
    // #region agent log
    const err = error as { name?: string; message?: string; code?: string };
    debugCmsLog("A,B,C,E", "content.ts:getContentMap:error", "getContentMap query failed", {
      name: err?.name ?? null,
      code: err?.code ?? null,
      message: String(err?.message ?? error).slice(0, 240),
    });
    // #endregion
    throw error;
  }
}

export async function listContents() {
  return prisma.siteContent.findMany({ orderBy: { key: "asc" } });
}

export async function upsertContent(input: {
  key: string;
  value: string;
  type?: "TEXT" | "RICHTEXT" | "IMAGE" | "JSON";
  updatedById?: string;
}) {
  return prisma.siteContent.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      value: input.value,
      type: input.type ?? "TEXT",
      updatedById: input.updatedById,
    },
    update: {
      value: input.value,
      type: input.type,
      updatedById: input.updatedById,
    },
  });
}
