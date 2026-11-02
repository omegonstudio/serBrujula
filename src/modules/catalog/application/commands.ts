"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/modules/identity/application/require-admin";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional().or(z.literal("")),
  slug: z.string().optional(),
});

export async function upsertProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || undefined;
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    priceCents: Number(formData.get("priceCents")),
    stock: Number(formData.get("stock")),
    categoryId: String(formData.get("categoryId") || "") || null,
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    imageUrl: String(formData.get("imageUrl") ?? ""),
    slug: String(formData.get("slug") ?? "") || undefined,
  });

  if (!parsed.success) {
    throw new AppError("VALIDATION", "Datos de producto inválidos", {
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);

  const product = await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.product.update({
          where: { id },
          data: {
            name: data.name,
            slug,
            description: data.description,
            priceCents: data.priceCents,
            categoryId: data.categoryId,
            isFeatured: data.isFeatured,
            isActive: data.isActive,
          },
        })
      : await tx.product.create({
          data: {
            name: data.name,
            slug,
            description: data.description,
            priceCents: data.priceCents,
            categoryId: data.categoryId,
            isFeatured: data.isFeatured,
            isActive: data.isActive,
          },
        });

    await tx.inventory.upsert({
      where: { productId: saved.id },
      create: { productId: saved.id, quantity: data.stock },
      update: { quantity: data.stock },
    });

    if (data.imageUrl) {
      const existing = await tx.productImage.findFirst({
        where: { productId: saved.id, isPrimary: true },
      });
      if (existing) {
        await tx.productImage.update({
          where: { id: existing.id },
          data: { url: data.imageUrl },
        });
      } else {
        await tx.productImage.create({
          data: {
            productId: saved.id,
            url: data.imageUrl,
            isPrimary: true,
            sortOrder: 0,
          },
        });
      }
    }

    return saved;
  });

  revalidatePath("/tienda");
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${product.id}`);
  redirect("/admin/productos");
}

export async function deactivateProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new AppError("VALIDATION", "Producto requerido");
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath("/tienda");
  revalidatePath("/admin/productos");
}

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? "") || undefined,
  });
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Categoría inválida");
  }
  await prisma.productCategory.create({
    data: {
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      description: parsed.data.description,
    },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}
