export type CreateCheckoutInput = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  payerEmail: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  idempotencyKey: string;
};

export type CreateCheckoutResult = {
  redirectUrl: string;
  externalReference: string;
  providerCheckoutId?: string;
};

export type PaymentWebhookEvent = {
  orderId?: string;
  providerPaymentId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  amountCents?: number;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: "MERCADO_PAGO" | "STRIPE" | "MANUAL";
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(request: Request): Promise<PaymentWebhookEvent | null>;
}
