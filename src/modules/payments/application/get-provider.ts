import type { PaymentProvider } from "@/modules/payments/domain/payment-provider";
import { ManualPaymentProvider } from "@/modules/payments/infrastructure/manual-provider";
import { MercadoPagoProvider } from "@/modules/payments/infrastructure/mercadopago-provider";
import { logger } from "@/lib/logger";

export function getPaymentProvider(): PaymentProvider {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (token) {
    return new MercadoPagoProvider(token);
  }
  logger.warn("payments.using_manual_provider", {
    reason: "MERCADOPAGO_ACCESS_TOKEN no configurado",
  });
  return new ManualPaymentProvider();
}
