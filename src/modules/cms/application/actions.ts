"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { upsertContent } from "@/modules/cms/application/content";

export async function saveContentAction(formData: FormData) {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");
  if (!key) return;

  await upsertContent({
    key,
    value,
    updatedById: session.user.id,
  });

  revalidatePath("/");
  revalidatePath("/sobre");
  revalidatePath("/servicios");
  revalidatePath("/contacto");
  revalidatePath("/admin/contenidos");
}
