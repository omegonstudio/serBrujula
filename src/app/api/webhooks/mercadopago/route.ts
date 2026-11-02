import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/application/get-provider";
import { confirmPaymentApproved } from "@/modules/orders/application/confirm-payment";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const provider = getPaymentProvider();
    if (provider.name !== "MERCADO_PAGO") {
      return NextResponse.json({ ok: false, reason: "provider_mismatch" }, { status: 400 });
    }

    const event = await provider.verifyWebhook(request);
    if (!event) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (event.status !== "APPROVED" || !event.orderId) {
      logger.info("mp.webhook.not_approved", {
        status: event.status,
        ref: event.orderId,
      });
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.payment.findFirst({
      where: {
        provider: "MERCADO_PAGO",
        providerPaymentId: event.providerPaymentId,
        status: "APPROVED",
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ orderId: event.orderId }, { bookingId: event.orderId }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      logger.warn("mp.webhook.payment_missing", { ref: event.orderId });
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    await confirmPaymentApproved({
      orderId: payment.orderId ?? undefined,
      bookingId: payment.bookingId ?? undefined,
      providerPaymentId: event.providerPaymentId,
      rawPayload: event.raw as object,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("mp.webhook.failed", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
