import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMpSignature } from "./signature-helper";

const preferenceCreate = vi.fn();
const paymentGet = vi.fn();

vi.mock("mercadopago", async () => {
  const actual = await vi.importActual<typeof import("mercadopago")>("mercadopago");
  return {
    ...actual,
    MercadoPagoConfig: class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_opts?: unknown) {}
    },
    Preference: class {
      create = preferenceCreate;
    },
    Payment: class {
      get = paymentGet;
    },
  };
});

describe("MercadoPagoProvider", () => {
  const secret = "test-webhook-secret";
  const token = "TEST-access-token";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  });

  async function loadProvider() {
    const { MercadoPagoProvider } = await import(
      "@/modules/payments/infrastructure/mercadopago-provider"
    );
    return new MercadoPagoProvider(token, secret);
  }

  describe("createCheckout", () => {
    it("crea preferencia con importe, external_reference e idempotencyKey", async () => {
      preferenceCreate.mockResolvedValue({
        id: "pref-123",
        init_point: "https://mp.test/checkout",
      });
      const provider = await loadProvider();

      const result = await provider.createCheckout({
        orderId: "order-1",
        orderNumber: "SB-1",
        amountCents: 150050,
        currency: "ARS",
        payerEmail: "a@b.com",
        description: "Pedido SB-1",
        successUrl: "https://example.test/ok",
        failureUrl: "https://example.test/fail",
        pendingUrl: "https://example.test/pending",
        idempotencyKey: "order-order-1-pay",
      });

      expect(result.redirectUrl).toBe("https://mp.test/checkout");
      expect(result.providerCheckoutId).toBe("pref-123");
      expect(result.externalReference).toBe("order-1");
      expect(preferenceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            external_reference: "order-1",
            notification_url:
              "https://example.test/api/webhooks/mercadopago",
            items: [
              expect.objectContaining({
                unit_price: 1500.5,
                currency_id: "ARS",
                quantity: 1,
              }),
            ],
          }),
          requestOptions: { idempotencyKey: "order-order-1-pay" },
        }),
      );
    });

    it("usa sandbox_init_point si no hay init_point", async () => {
      preferenceCreate.mockResolvedValue({
        id: "pref-sb",
        sandbox_init_point: "https://mp.test/sandbox",
      });
      const provider = await loadProvider();
      const result = await provider.createCheckout({
        orderId: "o",
        orderNumber: "n",
        amountCents: 100,
        currency: "ARS",
        payerEmail: "a@b.com",
        description: "d",
        successUrl: "s",
        failureUrl: "f",
        pendingUrl: "p",
        idempotencyKey: "k",
      });
      expect(result.redirectUrl).toBe("https://mp.test/sandbox");
    });

    it("falla con AppError PAYMENT si el SDK no devuelve URL", async () => {
      preferenceCreate.mockResolvedValue({ id: "pref" });
      const provider = await loadProvider();
      await expect(
        provider.createCheckout({
          orderId: "o",
          orderNumber: "n",
          amountCents: 100,
          currency: "ARS",
          payerEmail: "a@b.com",
          description: "d",
          successUrl: "s",
          failureUrl: "f",
          pendingUrl: "p",
          idempotencyKey: "k",
        }),
      ).rejects.toMatchObject({ code: "PAYMENT" });
    });

    it("propaga AppError PAYMENT si Preference.create falla", async () => {
      preferenceCreate.mockRejectedValue(new Error("network down"));
      const provider = await loadProvider();
      await expect(
        provider.createCheckout({
          orderId: "o",
          orderNumber: "n",
          amountCents: 100,
          currency: "ARS",
          payerEmail: "a@b.com",
          description: "d",
          successUrl: "s",
          failureUrl: "f",
          pendingUrl: "p",
          idempotencyKey: "k",
        }),
      ).rejects.toMatchObject({ code: "PAYMENT" });
    });

    it("exige webhook secret en el constructor", async () => {
      const { MercadoPagoProvider } = await import(
        "@/modules/payments/infrastructure/mercadopago-provider"
      );
      expect(() => new MercadoPagoProvider(token, "")).toThrow(
        /WEBHOOK_SECRET/,
      );
    });
  });

  describe("verifyWebhook", () => {
    it("acepta firma válida y mapea pago aprobado", async () => {
      const dataId = "999888777";
      const requestId = "req-abc";
      const { xSignature } = buildMpSignature({
        secret,
        dataId,
        requestId,
      });
      paymentGet.mockResolvedValue({
        id: dataId,
        status: "approved",
        external_reference: "order-xyz",
        transaction_amount: 100.5,
        currency_id: "ARS",
      });

      const provider = await loadProvider();
      const request = new Request(
        `https://example.test/api/webhooks/mercadopago?type=payment&data.id=${dataId}`,
        {
          method: "POST",
          headers: {
            "x-signature": xSignature,
            "x-request-id": requestId,
            "content-type": "application/json",
          },
          body: JSON.stringify({ type: "payment", data: { id: dataId } }),
        },
      );

      const event = await provider.verifyWebhook(request);
      expect(event).toMatchObject({
        orderId: "order-xyz",
        providerPaymentId: dataId,
        status: "APPROVED",
        amountCents: 10050,
        currency: "ARS",
      });
      expect(paymentGet).toHaveBeenCalledWith({ id: dataId });
    });

    it("rechaza firma inválida", async () => {
      const provider = await loadProvider();
      const request = new Request(
        "https://example.test/api/webhooks/mercadopago?type=payment&data.id=1",
        {
          method: "POST",
          headers: {
            "x-signature": "ts=1,v1=deadbeef",
            "x-request-id": "r",
          },
          body: "{}",
        },
      );
      await expect(provider.verifyWebhook(request)).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });

    it("rechaza firma ausente", async () => {
      const provider = await loadProvider();
      const request = new Request(
        "https://example.test/api/webhooks/mercadopago?type=payment&data.id=1",
        { method: "POST", body: "{}" },
      );
      await expect(provider.verifyWebhook(request)).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });

    it("ignora eventos que no son payment", async () => {
      const dataId = "1";
      const requestId = "r2";
      const { xSignature } = buildMpSignature({
        secret,
        dataId,
        requestId,
      });
      const provider = await loadProvider();
      const request = new Request(
        `https://example.test/api/webhooks/mercadopago?type=merchant_order&data.id=${dataId}`,
        {
          method: "POST",
          headers: {
            "x-signature": xSignature,
            "x-request-id": requestId,
          },
          body: "{}",
        },
      );
      await expect(provider.verifyWebhook(request)).resolves.toBeNull();
      expect(paymentGet).not.toHaveBeenCalled();
    });

    it("mapea rejected y cancelled a REJECTED; pending/in_process a PENDING", async () => {
      const provider = await loadProvider();
      const cases = [
        ["rejected", "REJECTED"],
        ["cancelled", "REJECTED"],
        ["pending", "PENDING"],
        ["in_process", "PENDING"],
        ["refunded", "REFUNDED"],
      ] as const;

      for (const [mpStatus, mapped] of cases) {
        const dataId = `id-${mpStatus}`;
        const requestId = `req-${mpStatus}`;
        const { xSignature } = buildMpSignature({
          secret,
          dataId,
          requestId,
        });
        paymentGet.mockResolvedValue({
          id: dataId,
          status: mpStatus,
          external_reference: "ref",
          transaction_amount: 10,
          currency_id: "ARS",
        });
        const request = new Request(
          `https://example.test/api/webhooks/mercadopago?type=payment&data.id=${dataId}`,
          {
            method: "POST",
            headers: {
              "x-signature": xSignature,
              "x-request-id": requestId,
            },
            body: "{}",
          },
        );
        const event = await provider.verifyWebhook(request);
        expect(event?.status).toBe(mapped);
      }
    });

    it("propaga error si Payment.get falla", async () => {
      const dataId = "boom";
      const requestId = "r";
      const { xSignature } = buildMpSignature({
        secret,
        dataId,
        requestId,
      });
      paymentGet.mockRejectedValue(new Error("mp down"));
      const provider = await loadProvider();
      const request = new Request(
        `https://example.test/api/webhooks/mercadopago?type=payment&data.id=${dataId}`,
        {
          method: "POST",
          headers: {
            "x-signature": xSignature,
            "x-request-id": requestId,
          },
          body: "{}",
        },
      );
      await expect(provider.verifyWebhook(request)).rejects.toThrow("mp down");
    });
  });
});
