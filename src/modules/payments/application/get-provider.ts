import type { PaymentProvider } from "@/modules/payments/domain/payment-provider";
import { ManualPaymentProvider } from "@/modules/payments/infrastructure/manual-provider";
import { MercadoPagoProvider } from "@/modules/payments/infrastructure/mercadopago-provider";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function getPaymentProvider(): PaymentProvider {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (token) {
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError(
        "PAYMENT",
        "MERCADOPAGO_WEBHOOK_SECRET es obligatorio cuando Mercado Pago está activo",
      );
    }
    return new MercadoPagoProvider(token, webhookSecret);
  }
  logger.warn("payments.using_manual_provider", {
    reason: "MERCADOPAGO_ACCESS_TOKEN no configurado",
  });
  return new ManualPaymentProvider();
}
