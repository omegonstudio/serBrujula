import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/application/get-provider";
import { applyMercadoPagoWebhookEvent } from "@/modules/payments/application/apply-webhook-event";
import { InvalidWebhookSignatureError } from "@/modules/payments/infrastructure/mercadopago-provider";
import { logger } from "@/lib/logger";

/**
 * Mercado Pago Webhooks — solo POST firmado.
 * GET (IPN legacy) no confirma pagos: 405.
 */
export async function POST(request: Request) {
  try {
    const provider = getPaymentProvider();
    if (provider.name !== "MERCADO_PAGO") {
      return NextResponse.json(
        { ok: false, reason: "provider_mismatch" },
        { status: 400 },
      );
    }

    const event = await provider.verifyWebhook(request);
    if (!event) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await applyMercadoPagoWebhookEvent(event);

    if (result.outcome === "not_found") {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    if (result.outcome === "mismatch") {
      return NextResponse.json({ ok: true, mismatch: true });
    }

    if (result.outcome === "duplicate") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (result.outcome === "ignored") {
      return NextResponse.json({ ok: true, ignored: true, reason: result.reason });
    }

    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    logger.error("mp.webhook.failed", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "method_not_allowed",
      message:
        "IPN GET no está soportado. Configurá Webhooks POST firmados en Mercado Pago.",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
