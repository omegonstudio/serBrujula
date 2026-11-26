import { afterEach, describe, expect, it, vi } from "vitest";

describe("site-mode", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SITE_MODE;
  });

  async function load() {
    return import("@/lib/site-mode");
  }

  it("default es full", async () => {
    const { getSiteMode, isPresentationMode, getPublicNavItems } = await load();
    expect(getSiteMode()).toBe("full");
    expect(isPresentationMode()).toBe(false);
    expect(getPublicNavItems().some((i) => i.href === "/reservas")).toBe(true);
  });

  it("presentation oculta reservas en nav", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { getSiteMode, isPresentationMode, getPublicNavItems } = await load();
    expect(getSiteMode()).toBe("presentation");
    expect(isPresentationMode()).toBe(true);
    expect(getPublicNavItems().map((i) => i.href)).toEqual([
      "/",
      "/sobre",
      "/servicios",
      "/tienda",
      "/contacto",
    ]);
  });

  it("assertCommerceEnabled lanza FORBIDDEN en presentation", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "presentation";
    const { assertCommerceEnabled } = await load();
    expect(() => assertCommerceEnabled()).toThrow(/demostración/);
  });

  it("assertCommerceEnabled no lanza en full", async () => {
    process.env.NEXT_PUBLIC_SITE_MODE = "full";
    const { assertCommerceEnabled } = await load();
    expect(() => assertCommerceEnabled()).not.toThrow();
  });
});
