import { NextResponse } from "next/server";
import { ManualPaymentProvider } from "@/modules/payments/infrastructure/manual-provider";
import { confirmPaymentApproved } from "@/modules/orders/application/confirm-payment";
import { logger } from "@/lib/logger";
import { isAppError } from "@/lib/errors";
import { assertCommerceEnabled } from "@/lib/site-mode";

export async function POST(request: Request) {
  try {
    assertCommerceEnabled();
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    throw error;
  }

  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Manual payments disabled when Mercado Pago is configured" },
      { status: 403 },
    );
  }

  try {
    const provider = new ManualPaymentProvider();
    const event = await provider.verifyWebhook(request);
    if (!event?.orderId || event.status !== "APPROVED") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const body = event.raw as {
      orderId?: string;
      bookingId?: string;
      providerPaymentId?: string;
    };

    await confirmPaymentApproved({
      orderId: body.orderId,
      bookingId: body.bookingId ?? (body.orderId ? undefined : event.orderId),
      providerPaymentId: event.providerPaymentId,
      rawPayload: event.raw as object,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    logger.error("manual.webhook.failed", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
