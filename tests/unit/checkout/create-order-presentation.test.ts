import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/cart/application/cart-service", () => ({
  getCartSummary: vi.fn(),
}));

vi.mock("@/modules/cms/application/content", () => ({
  getContent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

describe("createOrderFromCart presentation gate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_MODE;
  });

  it("lanza FORBIDDEN en presentation antes de tocar el carrito", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { getCartSummary } = await import(
      "@/modules/cart/application/cart-service"
    );
    const { createOrderFromCart } = await import(
      "@/modules/checkout/application/create-order"
    );
    await expect(
      createOrderFromCart({
        fullName: "Demo",
        email: "demo@example.com",
        fulfillmentType: "PICKUP",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getCartSummary).not.toHaveBeenCalled();
  });
});
