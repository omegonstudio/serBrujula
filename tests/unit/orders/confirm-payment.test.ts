import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRaw = vi.fn();
const paymentFindFirst = vi.fn();
const paymentFindUnique = vi.fn();
const paymentFindUniqueOrThrow = vi.fn();
const paymentUpdateMany = vi.fn();
const inventoryUpdateMany = vi.fn();
const orderUpdate = vi.fn();
const orderUpdateMany = vi.fn();
const orderFindUniqueOrThrow = vi.fn();
const orderStatusHistoryCreate = vi.fn();
const sendOrderPaidEmail = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $executeRaw: (...args: unknown[]) => executeRaw(...args),
        payment: {
          findFirst: (...args: unknown[]) => paymentFindFirst(...args),
          findUnique: (...args: unknown[]) => paymentFindUnique(...args),
          findUniqueOrThrow: (...args: unknown[]) =>
            paymentFindUniqueOrThrow(...args),
          updateMany: (...args: unknown[]) => paymentUpdateMany(...args),
        },
        inventory: {
          updateMany: (...args: unknown[]) => inventoryUpdateMany(...args),
        },
        order: {
          update: (...args: unknown[]) => orderUpdate(...args),
          updateMany: (...args: unknown[]) => orderUpdateMany(...args),
          findUniqueOrThrow: (...args: unknown[]) =>
            orderFindUniqueOrThrow(...args),
        },
        orderStatusHistory: {
          create: (...args: unknown[]) => orderStatusHistoryCreate(...args),
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("@/modules/notifications/application/mail", () => ({
  sendOrderPaidEmail: (...args: unknown[]) => sendOrderPaidEmail(...args),
}));

vi.mock("@/modules/notifications/application/booking-mail", () => ({
  sendBookingConfirmedEmail: vi.fn(),
}));

vi.mock("@/modules/calendar/application/sync-booking", () => ({
  syncBookingToCalendar: vi.fn(),
}));

describe("confirmPaymentApproved (orders)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendOrderPaidEmail.mockResolvedValue(undefined);
  });

  function pendingPayment() {
    return {
      id: "pay-1",
      orderId: "order-1",
      status: "PENDING",
      providerPaymentId: null,
      order: {
        id: "order-1",
        orderNumber: "SB-1",
        status: "PENDING_PAYMENT",
        items: [
          {
            productId: "prod-1",
            productName: "Aceite",
            quantity: 2,
          },
        ],
      },
    };
  }

  async function confirm() {
    const { confirmPaymentApproved } = await import(
      "@/modules/orders/application/confirm-payment"
    );
    return confirmPaymentApproved({
      orderId: "order-1",
      providerPaymentId: "mp-1",
      rawPayload: { id: "mp-1" },
    });
  }

  it("descuenta stock una vez y envía email", async () => {
    const payment = pendingPayment();
    paymentFindFirst.mockResolvedValue(payment);
    paymentFindUnique.mockResolvedValue(payment);
    inventoryUpdateMany.mockResolvedValue({ count: 1 });
    paymentUpdateMany.mockResolvedValue({ count: 1 });
    orderUpdateMany.mockResolvedValue({ count: 1 });
    orderStatusHistoryCreate.mockResolvedValue({});
    orderFindUniqueOrThrow.mockResolvedValue({
      ...payment.order,
      status: "PAID",
      customerProfile: null,
    });
    paymentFindUniqueOrThrow.mockResolvedValue({
      ...payment,
      status: "APPROVED",
    });

    const result = await confirm();
    expect(result.alreadyProcessed).toBe(false);
    expect(inventoryUpdateMany).toHaveBeenCalledTimes(1);
    expect(inventoryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "prod-1", quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      }),
    );
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("idempotente: no re-descuenta ni reenvía email si ya APPROVED+PAID", async () => {
    const payment = {
      ...pendingPayment(),
      status: "APPROVED",
      order: { ...pendingPayment().order, status: "PAID" },
    };
    paymentFindFirst.mockResolvedValue(payment);
    paymentFindUnique.mockResolvedValue(payment);
    orderFindUniqueOrThrow.mockResolvedValue({
      ...payment.order,
      customerProfile: null,
    });

    const result = await confirm();
    expect(result.alreadyProcessed).toBe(true);
    expect(inventoryUpdateMany).not.toHaveBeenCalled();
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
  });

  it("falla con STOCK si no hay cantidad suficiente", async () => {
    const payment = pendingPayment();
    paymentFindFirst.mockResolvedValue(payment);
    paymentFindUnique.mockResolvedValue(payment);
    inventoryUpdateMany.mockResolvedValue({ count: 0 });

    await expect(confirm()).rejects.toMatchObject({ code: "STOCK" });
    expect(paymentUpdateMany).not.toHaveBeenCalled();
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
  });

  it("simula concurrencia: segundo claim falla y revierte vía excepción", async () => {
    const payment = pendingPayment();
    paymentFindFirst.mockResolvedValue(payment);
    paymentFindUnique.mockResolvedValue(payment);
    inventoryUpdateMany.mockResolvedValue({ count: 1 });
    paymentUpdateMany.mockResolvedValue({ count: 0 });

    await expect(confirm()).rejects.toMatchObject({ code: "CONFLICT" });
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
  });
});
