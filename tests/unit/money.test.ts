import { describe, expect, it } from "vitest";
import { formatArs, parsePriceToCents } from "@/lib/money";

describe("money", () => {
  it("formats ARS from cents", () => {
    expect(formatArs(450000)).toContain("4");
  });

  it("parses decimal price to cents", () => {
    expect(parsePriceToCents("45,50")).toBe(4550);
  });
});
