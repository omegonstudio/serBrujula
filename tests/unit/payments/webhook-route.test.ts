import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidWebhookSignatureError, SignatureFailureReason } from "mercadopago";

const verifyWebhook = vi.fn();
const applyEvent = vi.fn();
const getPaymentProvider = vi.fn();

vi.mock("@/modules/payments/application/get-provider", () => ({
  getPaymentProvider: () => getPaymentProvider(),
}));

vi.mock("@/modules/payments/application/apply-webhook-event", () => ({
  applyMercadoPagoWebhookEvent: (...args: unknown[]) => applyEvent(...args),
}));

describe("POST /api/webhooks/mercadopago", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPaymentProvider.mockReturnValue({
      name: "MERCADO_PAGO",
      verifyWebhook,
    });
  });

  async function post(body = "{}") {
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");
    return POST(
      new Request("https://example.test/api/webhooks/mercadopago", {
        method: "POST",
        body,
      }),
    );
  }

  it("responde 401 con firma inválida", async () => {
    verifyWebhook.mockRejectedValue(
      new InvalidWebhookSignatureError(
        SignatureFailureReason.SignatureMismatch,
      ),
    );
    const res = await post();
    expect(res.status).toBe(401);
  });

  it("responde 200 ignored si verifyWebhook retorna null", async () => {
    verifyWebhook.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: true });
  });

  it("responde 200 duplicate", async () => {
    verifyWebhook.mockResolvedValue({
      orderId: "o",
      providerPaymentId: "p",
      status: "APPROVED",
      amountCents: 100,
      currency: "ARS",
      raw: {},
    });
    applyEvent.mockResolvedValue({ outcome: "duplicate" });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ duplicate: true });
  });

  it("responde 200 mismatch sin confirmar", async () => {
    verifyWebhook.mockResolvedValue({
      orderId: "o",
      providerPaymentId: "p",
      status: "APPROVED",
      amountCents: 1,
      currency: "ARS",
      raw: {},
    });
    applyEvent.mockResolvedValue({
      outcome: "mismatch",
      reason: "amount_or_currency",
    });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ mismatch: true });
  });

  it("responde 404 si payment local no existe", async () => {
    verifyWebhook.mockResolvedValue({
      orderId: "missing",
      providerPaymentId: "p",
      status: "APPROVED",
      amountCents: 100,
      currency: "ARS",
      raw: {},
    });
    applyEvent.mockResolvedValue({ outcome: "not_found" });
    const res = await post();
    expect(res.status).toBe(404);
  });

  it("responde 500 si falla la comunicación con MP", async () => {
    verifyWebhook.mockRejectedValue(new Error("network"));
    const res = await post();
    expect(res.status).toBe(500);
  });

  it("GET responde 405 y no confirma pagos", async () => {
    const { GET } = await import("@/app/api/webhooks/mercadopago/route");
    const res = await GET();
    expect(res.status).toBe(405);
    expect(verifyWebhook).not.toHaveBeenCalled();
    expect(applyEvent).not.toHaveBeenCalled();
  });
});
