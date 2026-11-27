import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) };
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    err.digest = "NEXT_REDIRECT";
    throw err;
  },
}));

describe("contact email flow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_ADMIN_TO;
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("éxito solo si Resend envía admin + acuse", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    sendMock.mockResolvedValue({ id: "msg_1" });

    const { sendContactEmail } = await import(
      "@/modules/notifications/application/mail"
    );
    const result = await sendContactEmail({
      name: "Ana",
      email: "ana@example.com",
      message: "Hola, quiero info",
    });

    expect(result).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("sin RESEND_API_KEY no finge éxito", async () => {
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    const { sendContactEmail } = await import(
      "@/modules/notifications/application/mail"
    );
    const result = await sendContactEmail({
      name: "Ana",
      email: "ana@example.com",
      message: "Hola, quiero info",
    });
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("error de Resend → send_failed", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    sendMock.mockRejectedValue(new Error("upstream boom"));

    const { sendContactEmail } = await import(
      "@/modules/notifications/application/mail"
    );
    const result = await sendContactEmail({
      name: "Ana",
      email: "ana@example.com",
      message: "Hola, quiero info",
    });
    expect(result).toEqual({ ok: false, reason: "send_failed" });
  });

  it("contactAction redirige a sent=1 en éxito", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    sendMock.mockResolvedValue({ id: "msg_1" });

    const { contactAction } = await import(
      "@/modules/notifications/application/contact-action"
    );
    const fd = new FormData();
    fd.set("name", "Ana Demo");
    fd.set("email", "ana@example.com");
    fd.set("message", "Consulta de prueba");

    await expect(contactAction(fd)).rejects.toThrow(/NEXT_REDIRECT:\/contacto\?sent=1/);
  });

  it("contactAction sin Resend → error informativo, no sent", async () => {
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    const { contactAction } = await import(
      "@/modules/notifications/application/contact-action"
    );
    const fd = new FormData();
    fd.set("name", "Ana Demo");
    fd.set("email", "ana@example.com");
    fd.set("message", "Consulta de prueba");

    try {
      await contactAction(fd);
      expect.fail("expected redirect");
    } catch (error) {
      const msg = String((error as Error).message);
      expect(msg).toMatch(/NEXT_REDIRECT:\/contacto\?error=/);
      expect(msg).not.toMatch(/sent=1/);
      const decoded = decodeURIComponent(msg.split("error=")[1] ?? "");
      expect(decoded).toMatch(/email/i);
      expect(decoded).not.toMatch(/RESEND|apiKey|stack|Error:/i);
    }
  });

  it("contactAction con fallo Resend → error controlado sin detalles internos", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_ADMIN_TO = "admin@example.com";
    sendMock.mockRejectedValue(new Error("secret upstream detail"));

    const { contactAction } = await import(
      "@/modules/notifications/application/contact-action"
    );
    const fd = new FormData();
    fd.set("name", "Ana Demo");
    fd.set("email", "ana@example.com");
    fd.set("message", "Consulta de prueba");

    try {
      await contactAction(fd);
      expect.fail("expected redirect");
    } catch (error) {
      const msg = String((error as Error).message);
      expect(msg).toMatch(/NEXT_REDIRECT:\/contacto\?error=/);
      const decoded = decodeURIComponent(msg.split("error=")[1] ?? "");
      expect(decoded).toMatch(/No pudimos enviar/);
      expect(decoded).not.toContain("secret upstream");
      expect(decoded).not.toMatch(/RESEND|apiKey/i);
    }
  });
});

describe("mail logs privacy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it("mail.skipped_no_api_key no registra destinatario ni asunto", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendMail } = await import(
      "@/modules/notifications/infrastructure/send-mail"
    );
    await sendMail({
      kind: "contact_admin",
      to: "leak@example.com",
      subject: "Asunto secreto",
      html: "<p>contenido privado</p>",
    });
    const line = String(logSpy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("mail.skipped_no_api_key");
    expect(line).not.toContain("leak@example.com");
    expect(line).not.toContain("Asunto secreto");
    expect(line).not.toContain("contenido privado");
    const entry = JSON.parse(line);
    expect(entry.kind).toBe("contact_admin");
    expect(entry.status).toBe("skipped");
    expect(entry.to).toBeUndefined();
  });
});
