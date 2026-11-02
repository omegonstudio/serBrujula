"use server";

import { redirect } from "next/navigation";
import { confirmPaymentApproved } from "@/modules/orders/application/confirm-payment";

export async function confirmManualPaymentAction(formData: FormData) {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    redirect("/");
  }

  const orderId = String(formData.get("orderId") ?? "");
  const orderNumber = String(formData.get("orderNumber") ?? "");

  await confirmPaymentApproved({
    orderId,
    providerPaymentId: `manual-${orderId}`,
    rawPayload: { source: "manual-dev-confirm" },
  });

  redirect(`/pedido/${orderNumber}`);
}
