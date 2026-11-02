import { prisma } from "@/lib/prisma";

const productInclude = {
  category: true,
  inventory: true,
  images: { orderBy: { sortOrder: "asc" as const } },
};

export async function listPublicProducts(opts?: {
  categorySlug?: string;
  q?: string;
  featuredOnly?: boolean;
}) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      ...(opts?.featuredOnly ? { isFeatured: true } : {}),
      ...(opts?.categorySlug
        ? { category: { slug: opts.categorySlug, isActive: true } }
        : {}),
      ...(opts?.q
        ? {
            OR: [
              { name: { contains: opts.q, mode: "insensitive" } },
              { description: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: productInclude,
  });
}

export async function listCategories() {
  return prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listAdminProducts() {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
}
