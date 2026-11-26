import {
  MercadoPagoConfig,
  Preference,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/modules/payments/domain/payment-provider";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const SIGNATURE_TOLERANCE_SECONDS = 300;

export { InvalidWebhookSignatureError };

function pesosToCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "MERCADO_PAGO" as const;
  private client: MercadoPagoConfig;
  private webhookSecret: string;

  constructor(accessToken: string, webhookSecret: string) {
    if (!webhookSecret) {
      throw new AppError(
        "PAYMENT",
        "MERCADOPAGO_WEBHOOK_SECRET es obligatorio cuando Mercado Pago está activo",
      );
    }
    this.client = new MercadoPagoConfig({ accessToken });
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new AppError("PAYMENT", "NEXT_PUBLIC_APP_URL no configurada");
    }

    try {
      const preference = new Preference(this.client);
      const result = await preference.create({
        body: {
          external_reference: input.orderId,
          items: [
            {
              id: input.orderId,
              title: input.description,
              quantity: 1,
              unit_price: input.amountCents / 100,
              currency_id: input.currency,
            },
          ],
          payer: { email: input.payerEmail },
          back_urls: {
            success: input.successUrl,
            failure: input.failureUrl,
            pending: input.pendingUrl,
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/webhooks/mercadopago`,
          metadata: {
            orderId: input.orderId,
            orderNumber: input.orderNumber,
            idempotencyKey: input.idempotencyKey,
          },
        },
        requestOptions: {
          idempotencyKey: input.idempotencyKey,
        },
      });

      const redirectUrl = result.init_point ?? result.sandbox_init_point;
      if (!redirectUrl) {
        throw new AppError("PAYMENT", "Mercado Pago no devolvió URL de checkout");
      }

      return {
        redirectUrl,
        externalReference: input.orderId,
        providerCheckoutId: result.id ? String(result.id) : undefined,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("mp.preference.create_failed", {
        error,
        orderId: input.orderId,
      });
      throw new AppError("PAYMENT", "No se pudo crear la preferencia de pago", {
        cause: error,
      });
    }
  }

  async verifyWebhook(request: Request): Promise<PaymentWebhookEvent | null> {
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id");

    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId,
        secret: this.webhookSecret,
        toleranceSeconds: SIGNATURE_TOLERANCE_SECONDS,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        logger.warn("mp.webhook.invalid_signature", {
          reason: error.reason,
          requestId: error.requestId,
        });
        throw error;
      }
      throw error;
    }

    const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const paymentId =
      dataId ??
      (typeof body.data === "object" &&
      body.data &&
      "id" in body.data
        ? String((body.data as { id: string | number }).id)
        : undefined) ??
      url.searchParams.get("id") ??
      undefined;

    const bodyType =
      typeof body.type === "string"
        ? body.type
        : typeof body.topic === "string"
          ? body.topic
          : undefined;
    const eventType = type ?? bodyType;

    if (eventType && eventType !== "payment") {
      logger.info("mp.webhook.ignored", { type: eventType });
      return null;
    }

    if (!paymentId) {
      logger.warn("mp.webhook.missing_payment_id");
      return null;
    }

    const paymentApi = new Payment(this.client);
    const payment = await paymentApi.get({ id: paymentId });

    const statusMap: Record<string, PaymentWebhookEvent["status"]> = {
      approved: "APPROVED",
      pending: "PENDING",
      in_process: "PENDING",
      rejected: "REJECTED",
      cancelled: "REJECTED",
      refunded: "REFUNDED",
    };

    const mapped = statusMap[payment.status ?? ""] ?? "PENDING";
    const orderId =
      (payment.external_reference as string | undefined) ??
      (payment.metadata &&
      typeof payment.metadata === "object" &&
      "orderId" in payment.metadata
        ? String((payment.metadata as { orderId: string }).orderId)
        : undefined);

    const currency =
      typeof payment.currency_id === "string" ? payment.currency_id : undefined;

    return {
      orderId,
      providerPaymentId: String(payment.id),
      status: mapped,
      amountCents:
        typeof payment.transaction_amount === "number"
          ? pesosToCents(payment.transaction_amount)
          : undefined,
      currency,
      raw: {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        transaction_amount: payment.transaction_amount,
        currency_id: payment.currency_id,
      },
    };
  }
}
