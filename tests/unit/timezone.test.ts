import { describe, expect, it } from "vitest";
import { BUSINESS_TIMEZONE_DEFAULT, formatInBusinessTz } from "@/lib/timezone";

describe("timezone", () => {
  it("uses Buenos Aires as default business timezone", () => {
    expect(BUSINESS_TIMEZONE_DEFAULT).toBe("America/Argentina/Buenos_Aires");
  });

  it("formats a UTC date without throwing", () => {
    const formatted = formatInBusinessTz(new Date("2026-06-15T15:00:00.000Z"));
    expect(formatted.length).toBeGreaterThan(0);
  });
});
