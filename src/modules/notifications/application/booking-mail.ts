import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { formatInBusinessTz } from "@/lib/timezone";
import { sendMail } from "@/modules/notifications/infrastructure/send-mail";

export async function sendBookingConfirmedEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      location: true,
      customerProfile: true,
    },
  });
  if (!booking) return;

  const when = formatInBusinessTz(booking.startsAt);
  const html = `
    <p>Hola ${booking.customerProfile.fullName},</p>
    <p>Tu reserva <strong>${booking.bookingNumber}</strong> está confirmada.</p>
    <p>${booking.service.name}<br/>
    ${booking.location.name} (${booking.location.type})<br/>
    ${when}<br/>
    ${formatArs(booking.priceCents)}</p>
    <p>Gracias por elegir Ser Brújula.</p>
  `;

  await sendMail({
    kind: "booking_confirmed_customer",
    to: booking.customerProfile.email,
    subject: `Reserva confirmada ${booking.bookingNumber}`,
    html,
  });

  const adminTo = process.env.EMAIL_ADMIN_TO;
  if (adminTo) {
    await sendMail({
      kind: "booking_confirmed_admin",
      to: adminTo,
      subject: `Nueva reserva ${booking.bookingNumber}`,
      html,
    });
  }
}

export async function sendBookingCancelledEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, customerProfile: true },
  });
  if (!booking) return;
  await sendMail({
    kind: "booking_cancelled_customer",
    to: booking.customerProfile.email,
    subject: `Reserva cancelada ${booking.bookingNumber}`,
    html: `<p>Hola ${booking.customerProfile.fullName},</p>
      <p>Tu reserva ${booking.bookingNumber} (${booking.service.name}) fue cancelada.</p>`,
  });
}
