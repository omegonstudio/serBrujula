import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { logger } from "@/lib/logger";

async function sendMail(input: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ser Brújula <onboarding@resend.dev>";

  if (!apiKey) {
    logger.info("mail.skipped_no_api_key", {
      to: input.to,
      subject: input.subject,
    });
    return { skipped: true as const };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  return { skipped: false as const };
}

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
    to: order.email,
    subject: `Pedido confirmado ${order.orderNumber}`,
    html,
  });

  const adminTo = process.env.EMAIL_ADMIN_TO;
  if (adminTo) {
    await sendMail({
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
}) {
  const adminTo = process.env.EMAIL_ADMIN_TO ?? process.env.SEED_ADMIN_EMAIL;
  if (!adminTo) {
    logger.warn("contact.no_admin_email");
    return;
  }

  await sendMail({
    to: adminTo,
    subject: `Consulta web — ${input.name}`,
    html: `<p><strong>${input.name}</strong> (${input.email})</p><p>${input.message}</p>`,
  });

  await sendMail({
    to: input.email,
    subject: "Recibimos tu consulta — Ser Brújula",
    html: `<p>Hola ${input.name},</p><p>Gracias por escribirnos. Te responderemos a la brevedad.</p>`,
  });
}
