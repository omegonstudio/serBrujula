import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/modules/payments/domain/payment-provider";
import { logger } from "@/lib/logger";

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "MERCADO_PAGO" as const;
  private client: MercadoPagoConfig;

  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({ accessToken });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
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
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });

    const redirectUrl = result.init_point ?? result.sandbox_init_point;
    if (!redirectUrl) {
      throw new Error("Mercado Pago no devolvió URL de checkout");
    }

    return {
      redirectUrl,
      externalReference: input.orderId,
      providerCheckoutId: result.id ? String(result.id) : undefined,
    };
  }

  async verifyWebhook(request: Request): Promise<PaymentWebhookEvent | null> {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
    const dataId =
      url.searchParams.get("data.id") ??
      url.searchParams.get("id") ??
      undefined;

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
        : undefined);

    if (type && type !== "payment") {
      logger.info("mp.webhook.ignored", { type });
      return null;
    }

    if (!paymentId) {
      logger.warn("mp.webhook.missing_payment_id", { body });
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

    return {
      orderId,
      providerPaymentId: String(payment.id),
      status: mapped,
      amountCents:
        typeof payment.transaction_amount === "number"
          ? Math.round(payment.transaction_amount * 100)
          : undefined,
      raw: payment,
    };
  }
}
