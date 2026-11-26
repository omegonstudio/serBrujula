import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const paymentUpdate = vi.fn();
const confirmPaymentApproved = vi.fn();
const txPaymentUpdate = vi.fn();
const txOrderUpdate = vi.fn();
const txOrderHistory = vi.fn();
const txBookingUpdate = vi.fn();
const txPaymentFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      update: (...args: unknown[]) => paymentUpdate(...args),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        payment: {
          findUnique: (...args: unknown[]) => txPaymentFindUnique(...args),
          update: (...args: unknown[]) => txPaymentUpdate(...args),
        },
        order: {
          update: (...args: unknown[]) => txOrderUpdate(...args),
        },
        orderStatusHistory: {
          create: (...args: unknown[]) => txOrderHistory(...args),
        },
        booking: {
          update: (...args: unknown[]) => txBookingUpdate(...args),
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("@/modules/orders/application/confirm-payment", () => ({
  confirmPaymentApproved: (...args: unknown[]) =>
    confirmPaymentApproved(...args),
}));

describe("applyMercadoPagoWebhookEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function apply(
    event: import("@/modules/payments/domain/payment-provider").PaymentWebhookEvent,
  ) {
    const mod = await import(
      "@/modules/payments/application/apply-webhook-event"
    );
    return mod.applyMercadoPagoWebhookEvent(event);
  }

  function basePayment(overrides: Record<string, unknown> = {}) {
    return {
      id: "pay-1",
      orderId: "order-1",
      bookingId: null,
      amountCents: 10000,
      status: "PENDING",
      providerPaymentId: null,
      order: { id: "order-1", currency: "ARS", status: "PENDING_PAYMENT" },
      booking: null,
      ...overrides,
    };
  }

  it("ignora sin external_reference", async () => {
    const result = await apply({
      providerPaymentId: "1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({
      outcome: "ignored",
      reason: "missing_external_reference",
    });
  });

  it("retorna not_found si no hay Payment local", async () => {
    findFirst.mockResolvedValue(null);
    const result = await apply({
      orderId: "missing",
      providerPaymentId: "1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("no confirma con importe incorrecto (mismatch + investigation)", async () => {
    findFirst.mockResolvedValue(basePayment());
    paymentUpdate.mockResolvedValue({});
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "APPROVED",
      amountCents: 9999,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({
      outcome: "mismatch",
      reason: "amount_or_currency",
    });
    expect(confirmPaymentApproved).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rawPayload: expect.objectContaining({
            investigation: "AMOUNT_OR_CURRENCY_MISMATCH",
          }),
        }),
      }),
    );
  });

  it("no confirma con moneda incorrecta", async () => {
    findFirst.mockResolvedValue(basePayment());
    paymentUpdate.mockResolvedValue({});
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "USD",
      raw: {},
    });
    expect(result.outcome).toBe("mismatch");
    expect(confirmPaymentApproved).not.toHaveBeenCalled();
  });

  it("confirma pago aprobado con importe y moneda correctos", async () => {
    findFirst
      .mockResolvedValueOnce(basePayment())
      .mockResolvedValueOnce(null);
    confirmPaymentApproved.mockResolvedValue({ alreadyProcessed: false });
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "ARS",
      raw: { id: "mp-1" },
    });
    expect(result).toEqual({ outcome: "applied", status: "APPROVED" });
    expect(confirmPaymentApproved).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        providerPaymentId: "mp-1",
      }),
    );
  });

  it("marca duplicate si ya estaba aprobado", async () => {
    findFirst
      .mockResolvedValueOnce(
        basePayment({
          status: "APPROVED",
          providerPaymentId: "mp-1",
          order: { id: "order-1", currency: "ARS", status: "PAID" },
        }),
      )
      .mockResolvedValueOnce({ id: "pay-1" });
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({ outcome: "duplicate" });
    expect(confirmPaymentApproved).not.toHaveBeenCalled();
  });

  it("aplica pending sin cancelar el pedido", async () => {
    findFirst.mockResolvedValue(basePayment());
    txPaymentFindUnique.mockResolvedValue(basePayment());
    txPaymentUpdate.mockResolvedValue({});
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "PENDING",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({ outcome: "applied", status: "PENDING" });
    expect(txPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      }),
    );
    // Already PENDING_PAYMENT → no order mutation (must not CANCELLED)
    expect(txOrderUpdate).not.toHaveBeenCalled();
  });

  it("aplica rejected → Payment REJECTED + Order CANCELLED", async () => {
    findFirst.mockResolvedValue(basePayment());
    txPaymentFindUnique.mockResolvedValue(basePayment());
    txPaymentUpdate.mockResolvedValue({});
    txOrderUpdate.mockResolvedValue({});
    txOrderHistory.mockResolvedValue({});
    const result = await apply({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      status: "REJECTED",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result).toEqual({ outcome: "applied", status: "REJECTED" });
    expect(txPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED" }),
      }),
    );
    expect(txOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      }),
    );
  });

  it("external_reference incorrecto (payment missing) → not_found", async () => {
    findFirst.mockResolvedValue(null);
    const result = await apply({
      orderId: "unknown-ref",
      providerPaymentId: "mp-1",
      status: "APPROVED",
      amountCents: 10000,
      currency: "ARS",
      raw: {},
    });
    expect(result.outcome).toBe("not_found");
  });
});
