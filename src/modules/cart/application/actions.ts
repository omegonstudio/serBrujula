"use server";

import { revalidatePath } from "next/cache";
import { addToCart, updateCartItem } from "@/modules/cart/application/cart-service";
import { isAppError } from "@/lib/errors";

export async function addToCartAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  try {
    await addToCart(productId, quantity);
    revalidatePath("/carrito");
    revalidatePath("/tienda");
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "No se pudo agregar al carrito" };
  }
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  await updateCartItem(itemId, quantity);
  revalidatePath("/carrito");
}
