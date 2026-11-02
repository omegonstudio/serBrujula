import { prisma } from "@/lib/prisma";

export async function getContent(key: string, fallback = ""): Promise<string> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getContentMap(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.siteContent.findMany({
    where: { key: { in: keys } },
  });
  const map: Record<string, string> = {};
  for (const key of keys) map[key] = "";
  for (const row of rows) map[row.key] = row.value;
  return map;
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
