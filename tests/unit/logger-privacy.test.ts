import { afterEach, describe, expect, it, vi } from "vitest";

describe("logger redacts mail PII fields", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("redacta to/email/html/subject y deja kind/status", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("@/lib/logger");
    logger.info("mail.test", {
      kind: "contact_admin",
      status: "skipped",
      to: "leak@example.com",
      email: "leak@example.com",
      message: "texto del usuario",
      html: "<p>html</p>",
      subject: "Asunto",
      apiKey: "re_secret",
    });
    expect(logSpy).toHaveBeenCalled();
    const line = String(logSpy.mock.calls[0]?.[0] ?? "");
    const entry = JSON.parse(line);
    expect(entry.message).toBe("mail.test");
    expect(entry.kind).toBe("contact_admin");
    expect(entry.status).toBe("skipped");
    expect(entry.to).toBe("[redacted]");
    expect(entry.email).toBe("[redacted]");
    expect(entry.html).toBe("[redacted]");
    expect(entry.subject).toBe("[redacted]");
    expect(entry.apiKey).toBe("[redacted]");
    // fields.message se redacta y no pisa el nombre del evento
    expect(entry.message).toBe("mail.test");
    expect(line).not.toContain("leak@example.com");
    expect(line).not.toContain("texto del usuario");
    expect(line).not.toContain("re_secret");
  });

  it("no redacta campos diagnósticos por substring corto (p. ej. totalCents)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("@/lib/logger");
    logger.info("order.totals", { totalCents: 1500, kind: "order" });
    const entry = JSON.parse(String(logSpy.mock.calls[0]?.[0] ?? "{}"));
    expect(entry.totalCents).toBe(1500);
    expect(entry.kind).toBe("order");
  });
});
