"use server";

import { redirect } from "next/navigation";
import { createOrderFromCart } from "@/modules/checkout/application/create-order";
import { abandonFailedCheckout } from "@/modules/checkout/application/abandon-checkout";
import { getPaymentProvider } from "@/modules/payments/application/get-provider";
import { clearCart } from "@/modules/cart/application/cart-service";
import { prisma } from "@/lib/prisma";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertCommerceEnabled } from "@/lib/site-mode";

export async function checkoutAction(formData: FormData) {
  let orderId: string | undefined;
  let cartId: string | undefined;

  try {
    assertCommerceEnabled();
    const fulfillmentType = String(formData.get("fulfillmentType") ?? "PICKUP");
    const { order, payment, cartId: createdCartId } = await createOrderFromCart({
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      fulfillmentType: fulfillmentType === "SHIPPING" ? "SHIPPING" : "PICKUP",
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    orderId = order.id;
    cartId = createdCartId;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountCents: order.totalCents,
      currency: order.currency,
      payerEmail: order.email,
      description: `Pedido ${order.orderNumber} — Ser Brújula`,
      successUrl: `${appUrl}/pedido/${order.orderNumber}?status=return`,
      failureUrl: `${appUrl}/pedido/${order.orderNumber}?status=failure`,
      pendingUrl: `${appUrl}/pedido/${order.orderNumber}?status=pending`,
      idempotencyKey: payment.idempotencyKey,
    });

    if (checkout.providerCheckoutId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerCheckoutId: checkout.providerCheckoutId },
      });
    }

    if (cartId) {
      await clearCart(cartId);
    }

    redirect(checkout.redirectUrl);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error; // Next.js redirect
    }

    if (orderId) {
      await abandonFailedCheckout(
        orderId,
        "Checkout cancelado: fallo al crear preferencia de pago",
      );
    }

    logger.error("checkout.failed", { error, orderId });
    if (isAppError(error)) {
      redirect(`/checkout?error=${encodeURIComponent(error.message)}`);
    }
    redirect(
      `/checkout?error=${encodeURIComponent("No se pudo iniciar el checkout")}`,
    );
  }
}
