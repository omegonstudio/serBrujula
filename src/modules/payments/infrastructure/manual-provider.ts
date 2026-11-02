import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/modules/payments/domain/payment-provider";

/**
 * Local/dev provider when Mercado Pago credentials are absent.
 * Not for production: checkout redirects to an explicit demo confirmation page.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "MANUAL" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const demo = new URL(
      `/pedido/${input.orderNumber}/pagar`,
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    );
    return {
      redirectUrl: demo.toString(),
      externalReference: input.orderId,
      providerCheckoutId: `manual-${input.orderId}`,
    };
  }

  async verifyWebhook(request: Request): Promise<PaymentWebhookEvent | null> {
    const secret = process.env.MANUAL_PAYMENT_SECRET ?? "dev-manual-secret";
    const header = request.headers.get("x-manual-payment-secret");
    if (header !== secret) return null;

    const body = (await request.json()) as {
      orderId: string;
      providerPaymentId?: string;
    };

    return {
      orderId: body.orderId,
      providerPaymentId: body.providerPaymentId ?? `manual-${body.orderId}`,
      status: "APPROVED",
      raw: body,
    };
  }
}
