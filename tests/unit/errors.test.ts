import { describe, expect, it } from "vitest";
import { AppError, toErrorResponse } from "@/lib/errors";

describe("AppError", () => {
  it("maps domain codes to HTTP status", () => {
    expect(new AppError("UNAUTHORIZED", "x").status).toBe(401);
    expect(new AppError("STOCK", "sin stock").status).toBe(409);
  });

  it("serializes unknown errors safely", () => {
    const response = toErrorResponse(new Error("boom"));
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL");
    expect(response.body.error.message).not.toContain("boom");
  });
});
