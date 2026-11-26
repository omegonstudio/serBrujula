import { beforeEach, describe, expect, it, vi } from "vitest";

const orderFindUnique = vi.fn();
const orderUpdate = vi.fn();
const historyCreate = vi.fn();
const paymentUpdateMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        order: {
          findUnique: (...args: unknown[]) => orderFindUnique(...args),
          update: (...args: unknown[]) => orderUpdate(...args),
        },
        orderStatusHistory: {
          create: (...args: unknown[]) => historyCreate(...args),
        },
        payment: {
          updateMany: (...args: unknown[]) => paymentUpdateMany(...args),
        },
      }),
  },
}));

describe("abandonFailedCheckout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("cancela order y rechaza payment si la preferencia falla", async () => {
    orderFindUnique.mockResolvedValue({
      id: "order-1",
      status: "PENDING_PAYMENT",
    });
    orderUpdate.mockResolvedValue({});
    historyCreate.mockResolvedValue({});
    paymentUpdateMany.mockResolvedValue({ count: 1 });

    const { abandonFailedCheckout } = await import(
      "@/modules/checkout/application/abandon-checkout"
    );
    await abandonFailedCheckout("order-1", "fallo preferencia");

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      }),
    );
    expect(paymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED" }),
      }),
    );
  });

  it("no toca pedidos ya PAID", async () => {
    orderFindUnique.mockResolvedValue({ id: "order-1", status: "PAID" });
    const { abandonFailedCheckout } = await import(
      "@/modules/checkout/application/abandon-checkout"
    );
    await abandonFailedCheckout("order-1", "x");
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
