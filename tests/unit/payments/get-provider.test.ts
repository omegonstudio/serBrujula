import { afterEach, describe, expect, it, vi } from "vitest";

describe("getPaymentProvider", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  it("usa MANUAL si no hay access token", async () => {
    const { getPaymentProvider } = await import(
      "@/modules/payments/application/get-provider"
    );
    const provider = getPaymentProvider();
    expect(provider.name).toBe("MANUAL");
  });

  it("exige WEBHOOK_SECRET si hay access token", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const { getPaymentProvider } = await import(
      "@/modules/payments/application/get-provider"
    );
    expect(() => getPaymentProvider()).toThrow(/WEBHOOK_SECRET/);
  });

  it("devuelve MERCADO_PAGO con token y secret", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "whsec";
    const { getPaymentProvider } = await import(
      "@/modules/payments/application/get-provider"
    );
    const provider = getPaymentProvider();
    expect(provider.name).toBe("MERCADO_PAGO");
  });
});
