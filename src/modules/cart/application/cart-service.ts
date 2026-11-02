import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export const CART_COOKIE = "sb_cart";
const CART_DAYS = 14;

export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CART_DAYS * 24 * 60 * 60,
  };
}

async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value;
}

/** Sets cookie — call only from Server Action / Route Handler. */
export async function ensureCartSessionToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const token = nanoid(24);
  jar.set(CART_COOKIE, token, cartCookieOptions());
  return token;
}

export async function getOrCreateCart() {
  const token = await ensureCartSessionToken();
  const expiresAt = new Date(Date.now() + CART_DAYS * 24 * 60 * 60 * 1000);

  return prisma.cart.upsert({
    where: { sessionToken: token },
    create: { sessionToken: token, expiresAt },
    update: { expiresAt },
    include: {
      items: {
        include: {
          product: {
            include: {
              inventory: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });
}

/** Read-only cart for layouts/pages (no cookie writes). */
export async function getCartSummary() {
  const token = await readSessionToken();
  if (!token) {
    return { cart: null, items: [], subtotalCents: 0, itemCount: 0 };
  }

  const cart = await prisma.cart.findUnique({
    where: { sessionToken: token },
    include: {
      items: {
        include: {
          product: {
            include: {
              inventory: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return { cart: null, items: [], subtotalCents: 0, itemCount: 0 };
  }

  const activeItems = cart.items.filter((i) => i.product.isActive);
  const subtotalCents = activeItems.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  return { cart, items: activeItems, subtotalCents, itemCount };
}

export async function addToCart(productId: string, quantity = 1) {
  if (quantity < 1) throw new AppError("VALIDATION", "Cantidad inválida");

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    include: { inventory: true },
  });
  if (!product) throw new AppError("NOT_FOUND", "Producto no encontrado");

  const available = product.inventory?.quantity ?? 0;
  if (available < 1) throw new AppError("STOCK", "Sin stock disponible");

  const cart = await getOrCreateCart();
  const existing = cart.items.find((i) => i.productId === productId);
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > available) {
    throw new AppError("STOCK", "No hay suficiente stock");
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }
}

export async function updateCartItem(itemId: string, quantity: number) {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new AppError("NOT_FOUND", "Ítem no encontrado");

  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return;
  }

  const available = item.product.inventory?.quantity ?? 0;
  if (quantity > available) {
    throw new AppError("STOCK", "No hay suficiente stock");
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
