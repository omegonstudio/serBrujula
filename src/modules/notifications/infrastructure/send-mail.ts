import { Resend } from "resend";
import { logger } from "@/lib/logger";

export type MailKind =
  | "contact_admin"
  | "contact_ack"
  | "order_paid_customer"
  | "order_paid_admin"
  | "booking_confirmed_customer"
  | "booking_confirmed_admin"
  | "booking_cancelled_customer";

export type SendMailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed" };

/**
 * Envía correo vía Resend. No loguea destinatarios, asuntos ni cuerpos.
 */
export async function sendMail(input: {
  kind: MailKind;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ser Brújula <onboarding@resend.dev>";

  if (!apiKey) {
    logger.info("mail.skipped_no_api_key", {
      kind: input.kind,
      status: "skipped",
    });
    return { status: "skipped", reason: "not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    logger.info("mail.sent", { kind: input.kind, status: "sent" });
    return { status: "sent" };
  } catch (error) {
    logger.error("mail.send_failed", {
      kind: input.kind,
      status: "failed",
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return { status: "failed" };
  }
}
