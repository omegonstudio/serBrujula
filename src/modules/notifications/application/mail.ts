import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { logger } from "@/lib/logger";
import { sendMail } from "@/modules/notifications/infrastructure/send-mail";

export type ContactEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "no_recipient" | "send_failed" };

export async function sendOrderPaidEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customerProfile: true },
  });
  if (!order) return;

  const lines = order.items
    .map(
      (i) =>
        `<li>${i.productName} × ${i.quantity} — ${formatArs(i.lineTotalCents)}</li>`,
    )
    .join("");

  const html = `
    <p>Hola ${order.customerProfile.fullName},</p>
    <p>Recibimos el pago de tu pedido <strong>${order.orderNumber}</strong>.</p>
    <ul>${lines}</ul>
    <p>Total: <strong>${formatArs(order.totalCents)}</strong></p>
    <p>Gracias por elegir Ser Brújula.</p>
  `;

  await sendMail({
    kind: "order_paid_customer",
    to: order.email,
    subject: `Pedido confirmado ${order.orderNumber}`,
    html,
  });

  const adminTo = process.env.EMAIL_ADMIN_TO;
  if (adminTo) {
    await sendMail({
      kind: "order_paid_admin",
      to: adminTo,
      subject: `Nuevo pedido pagado ${order.orderNumber}`,
      html,
    });
  }
}

export async function sendContactEmail(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("contact.not_configured", { status: "skipped" });
    return { ok: false, reason: "not_configured" };
  }

  const adminTo = process.env.EMAIL_ADMIN_TO ?? process.env.SEED_ADMIN_EMAIL;
  if (!adminTo) {
    logger.warn("contact.no_admin_email", { status: "failed" });
    return { ok: false, reason: "no_recipient" };
  }

  const adminResult = await sendMail({
    kind: "contact_admin",
    to: adminTo,
    subject: `Consulta web — ${input.name}`,
    html: `<p><strong>${input.name}</strong> (${input.email})</p><p>${input.message}</p>`,
  });

  if (adminResult.status !== "sent") {
    return {
      ok: false,
      reason: adminResult.status === "skipped" ? "not_configured" : "send_failed",
    };
  }

  const ackResult = await sendMail({
    kind: "contact_ack",
    to: input.email,
    subject: "Recibimos tu consulta — Ser Brújula",
    html: `<p>Hola ${input.name},</p><p>Gracias por escribirnos. Te responderemos a la brevedad.</p>`,
  });

  if (ackResult.status !== "sent") {
    return {
      ok: false,
      reason: ackResult.status === "skipped" ? "not_configured" : "send_failed",
    };
  }

  return { ok: true };
}
