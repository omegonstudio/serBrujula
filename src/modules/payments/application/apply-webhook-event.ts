import type { Prisma } from "@prisma/client";
import type { PaymentWebhookEvent } from "@/modules/payments/domain/payment-provider";
import { confirmPaymentApproved } from "@/modules/orders/application/confirm-payment";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type ApplyWebhookResult =
  | { outcome: "ignored"; reason: string }
  | { outcome: "mismatch"; reason: string }
  | { outcome: "duplicate" }
  | { outcome: "applied"; status: PaymentWebhookEvent["status"] }
  | { outcome: "not_found" };

/**
 * Applies a verified Mercado Pago payment event to local Order/Booking + Payment.
 * Idempotent. Never confirms on amount/currency mismatch (returns mismatch + 200 path).
 */
export async function applyMercadoPagoWebhookEvent(
  event: PaymentWebhookEvent,
): Promise<ApplyWebhookResult> {
  if (!event.orderId) {
    logger.warn("mp.webhook.missing_external_reference", {
      providerPaymentId: event.providerPaymentId,
    });
    return { outcome: "ignored", reason: "missing_external_reference" };
  }

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ orderId: event.orderId }, { bookingId: event.orderId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: true,
      booking: true,
    },
  });

  if (!payment) {
    logger.warn("mp.webhook.payment_missing", { ref: event.orderId });
    return { outcome: "not_found" };
  }

  if (
    payment.providerPaymentId &&
    payment.providerPaymentId !== event.providerPaymentId &&
    payment.status === "APPROVED"
  ) {
    logger.warn("mp.webhook.provider_payment_conflict", {
      paymentId: payment.id,
      existing: payment.providerPaymentId,
      incoming: event.providerPaymentId,
    });
    return { outcome: "ignored", reason: "provider_payment_conflict" };
  }

  const localCurrency = payment.order?.currency ?? payment.booking?.currency;
  const amountOk =
    typeof event.amountCents === "number" &&
    event.amountCents === payment.amountCents;
  const currencyOk =
    typeof event.currency === "string" &&
    typeof localCurrency === "string" &&
    event.currency === localCurrency;

  if (event.status === "APPROVED" && (!amountOk || !currencyOk)) {
    const investigation = {
      investigation: "AMOUNT_OR_CURRENCY_MISMATCH",
      providerPaymentId: event.providerPaymentId,
      mpAmountCents: event.amountCents,
      localAmountCents: payment.amountCents,
      mpCurrency: event.currency,
      localCurrency,
    };
    logger.error("mp.webhook.amount_currency_mismatch", investigation);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: event.providerPaymentId,
        rawPayload: investigation as Prisma.InputJsonValue,
      },
    });
    return { outcome: "mismatch", reason: "amount_or_currency" };
  }

  if (event.status === "APPROVED") {
    const existingApproved = await prisma.payment.findFirst({
      where: {
        provider: "MERCADO_PAGO",
        providerPaymentId: event.providerPaymentId,
        status: "APPROVED",
      },
    });
    if (existingApproved && existingApproved.id === payment.id) {
      const alreadyTerminal =
        (payment.order?.status === "PAID") ||
        (payment.booking?.status === "CONFIRMED");
      if (alreadyTerminal) {
        return { outcome: "duplicate" };
      }
    }

    await confirmPaymentApproved({
      orderId: payment.orderId ?? undefined,
      bookingId: payment.bookingId ?? undefined,
      providerPaymentId: event.providerPaymentId,
      rawPayload: event.raw as Prisma.InputJsonValue,
    });
    return { outcome: "applied", status: "APPROVED" };
  }

  if (event.status === "PENDING") {
    await applyNonApprovedStatus({
      paymentId: payment.id,
      orderId: payment.orderId,
      bookingId: payment.bookingId,
      providerPaymentId: event.providerPaymentId,
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT",
      bookingStatus: "PENDING_PAYMENT",
      raw: event.raw,
      skipIfApproved: true,
    });
    return { outcome: "applied", status: "PENDING" };
  }

  if (event.status === "REJECTED") {
    await applyNonApprovedStatus({
      paymentId: payment.id,
      orderId: payment.orderId,
      bookingId: payment.bookingId,
      providerPaymentId: event.providerPaymentId,
      paymentStatus: "REJECTED",
      orderStatus: "CANCELLED",
      bookingStatus: "CANCELLED",
      raw: event.raw,
      skipIfApproved: true,
    });
    return { outcome: "applied", status: "REJECTED" };
  }

  if (event.status === "REFUNDED") {
    await applyNonApprovedStatus({
      paymentId: payment.id,
      orderId: payment.orderId,
      bookingId: payment.bookingId,
      providerPaymentId: event.providerPaymentId,
      paymentStatus: "REFUNDED",
      orderStatus: "REFUNDED",
      bookingStatus: "CANCELLED",
      raw: event.raw,
      skipIfApproved: false,
    });
    return { outcome: "applied", status: "REFUNDED" };
  }

  return { outcome: "ignored", reason: "unhandled_status" };
}

type NonApprovedInput = {
  paymentId: string;
  orderId: string | null;
  bookingId: string | null;
  providerPaymentId: string;
  paymentStatus: "PENDING" | "REJECTED" | "REFUNDED";
  orderStatus: "PENDING_PAYMENT" | "CANCELLED" | "REFUNDED";
  bookingStatus: "PENDING_PAYMENT" | "CANCELLED";
  raw: unknown;
  skipIfApproved: boolean;
};

async function applyNonApprovedStatus(input: NonApprovedInput) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: input.paymentId },
      include: { order: true, booking: true },
    });
    if (!current) return;

    if (input.skipIfApproved && current.status === "APPROVED") {
      return;
    }

    await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: input.paymentStatus,
        providerPaymentId: input.providerPaymentId,
        rawPayload: input.raw as Prisma.InputJsonValue,
      },
    });

    if (input.orderId && current.order) {
      if (current.order.status === "PAID" && input.skipIfApproved) {
        return;
      }
      if (current.order.status !== input.orderStatus) {
        const fromStatus = current.order.status;
        await tx.order.update({
          where: { id: input.orderId },
          data: { status: input.orderStatus },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: input.orderId,
            fromStatus,
            toStatus: input.orderStatus,
            note: `Pago ${input.paymentStatus.toLowerCase()} por proveedor`,
          },
        });
      }
    }

    if (input.bookingId && current.booking) {
      if (current.booking.status === "CONFIRMED" && input.skipIfApproved) {
        return;
      }
      if (current.booking.status !== input.bookingStatus) {
        await tx.booking.update({
          where: { id: input.bookingId },
          data: { status: input.bookingStatus },
        });
      }
    }
  });
}
