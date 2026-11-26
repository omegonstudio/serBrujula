import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createOrderFromCart = vi.fn();
const getPaymentProvider = vi.fn();
const createBookingWithHold = vi.fn();
const createManualBooking = vi.fn();
const requireAdmin = vi.fn();

vi.mock("@/modules/checkout/application/create-order", () => ({
  createOrderFromCart: (...args: unknown[]) => createOrderFromCart(...args),
}));

vi.mock("@/modules/checkout/application/abandon-checkout", () => ({
  abandonFailedCheckout: vi.fn(),
}));

vi.mock("@/modules/payments/application/get-provider", () => ({
  getPaymentProvider: () => getPaymentProvider(),
}));

vi.mock("@/modules/cart/application/cart-service", () => ({
  clearCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: { update: vi.fn(), updateMany: vi.fn() },
    booking: { updateMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  },
}));

vi.mock("@/modules/booking/application/create-booking", () => ({
  createBookingWithHold: (...args: unknown[]) => createBookingWithHold(...args),
}));

vi.mock("@/modules/booking/application/manage-booking", () => ({
  cancelBooking: vi.fn(),
  createManualBooking: (...args: unknown[]) => createManualBooking(...args),
  rescheduleBooking: vi.fn(),
}));

vi.mock("@/modules/identity/application/require-admin", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "session-token" }),
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    err.digest = "NEXT_REDIRECT";
    throw err;
  },
}));

describe("presentation commerce guards", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_MODE;
  });

  it("checkoutAction no crea pedido en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { checkoutAction } = await import(
      "@/modules/checkout/application/actions"
    );
    const fd = new FormData();
    fd.set("fullName", "Demo");
    fd.set("email", "demo@example.com");
    await expect(checkoutAction(fd)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createOrderFromCart).not.toHaveBeenCalled();
    expect(getPaymentProvider).not.toHaveBeenCalled();
  });

  it("MercadoPagoProvider.createCheckout bloqueado en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
    const { MercadoPagoProvider } = await import(
      "@/modules/payments/infrastructure/mercadopago-provider"
    );
    const provider = new MercadoPagoProvider("TEST-token", "whsec");
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
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ManualPaymentProvider bloqueado en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { ManualPaymentProvider } = await import(
      "@/modules/payments/infrastructure/manual-provider"
    );
    const provider = new ManualPaymentProvider();
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
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("webhook MP responde 403 en presentation sin procesar", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");
    const res = await POST(
      new Request("https://example.test/api/webhooks/mercadopago", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("webhook manual responde 403 en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { POST } = await import("@/app/api/webhooks/manual-payment/route");
    const res = await POST(
      new Request("https://example.test/api/webhooks/manual-payment", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("submitBookingAction bloqueado en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { submitBookingAction } = await import(
      "@/modules/booking/application/actions"
    );
    const fd = new FormData();
    fd.set("serviceId", "s");
    fd.set("locationId", "l");
    fd.set("startsAtIso", new Date().toISOString());
    fd.set("fullName", "Demo");
    fd.set("email", "demo@example.com");
    await expect(submitBookingAction(fd)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createBookingWithHold).not.toHaveBeenCalled();
  });

  it("confirmManualBookingPaymentAction bloqueado en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { confirmManualBookingPaymentAction } = await import(
      "@/modules/booking/application/actions"
    );
    const fd = new FormData();
    fd.set("bookingId", "b1");
    fd.set("bookingNumber", "SB-1");
    await expect(confirmManualBookingPaymentAction(fd)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("adminCreateBookingAction bloqueado en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { adminCreateBookingAction } = await import(
      "@/modules/booking/application/actions"
    );
    const fd = new FormData();
    fd.set("serviceId", "s");
    fd.set("locationId", "l");
    fd.set("startsAtIso", new Date().toISOString());
    fd.set("fullName", "Demo");
    fd.set("email", "demo@example.com");
    await expect(adminCreateBookingAction(fd)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(createManualBooking).not.toHaveBeenCalled();
  });

  it("en full, ManualPaymentProvider createCheckout no lanza FORBIDDEN", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "full";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
    const { ManualPaymentProvider } = await import(
      "@/modules/payments/infrastructure/manual-provider"
    );
    const provider = new ManualPaymentProvider();
    const result = await provider.createCheckout({
      orderId: "o",
      orderNumber: "SB-1",
      amountCents: 100,
      currency: "ARS",
      payerEmail: "a@b.com",
      description: "d",
      successUrl: "s",
      failureUrl: "f",
      pendingUrl: "p",
      idempotencyKey: "k",
    });
    expect(result.redirectUrl).toContain("/pedido/SB-1/pagar");
  });
});
