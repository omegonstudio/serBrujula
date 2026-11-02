import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { buildOccupiedWindow, overlaps } from "@/modules/booking/domain/slots";
import { getFreeBusy } from "@/modules/calendar/application/freebusy";
import { syncBookingToCalendar } from "@/modules/calendar/application/sync-booking";
import { sendBookingCancelledEmail } from "@/modules/notifications/application/booking-mail";
import { nanoid } from "nanoid";

export async function cancelBooking(bookingId: string, note?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("NOT_FOUND", "Reserva no encontrada");
  if (booking.status === "CANCELLED") return booking;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      notes: note ? `${booking.notes ?? ""}\n[Cancelación] ${note}`.trim() : booking.notes,
      syncStatus: "SYNC_PENDING",
    },
  });

  await syncBookingToCalendar(bookingId);
  await sendBookingCancelledEmail(bookingId).catch(() => undefined);
  return updated;
}

export async function rescheduleBooking(input: {
  bookingId: string;
  startsAtIso: string;
}) {
  const existing = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { service: true, location: true, customerProfile: true },
  });
  if (!existing) throw new AppError("NOT_FOUND", "Reserva no encontrada");
  if (existing.status === "CANCELLED") {
    throw new AppError("VALIDATION", "No se puede reprogramar una reserva cancelada");
  }

  const startsAt = new Date(input.startsAtIso);
  const { endsAt, occupiedStartsAt, occupiedEndsAt } = buildOccupiedWindow({
    startsAt,
    durationMinutes: existing.service.durationMinutes,
    bufferBeforeMinutes: existing.service.bufferBeforeMinutes,
    bufferAfterMinutes: existing.service.bufferAfterMinutes,
    travelBufferMinutes: existing.location.travelBufferMinutes,
  });

  const googleBusy = await getFreeBusy(occupiedStartsAt, occupiedEndsAt).catch(
    () => [],
  );
  if (
    googleBusy.some((b) =>
      overlaps(
        { start: occupiedStartsAt, end: occupiedEndsAt },
        { start: b.start, end: b.end },
      ),
    )
  ) {
    throw new AppError("CONFLICT", "Horario no disponible en Google Calendar");
  }

  const newBooking = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: existing.id },
        locationId: existing.locationId,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        occupiedStartsAt: { lt: occupiedEndsAt },
        occupiedEndsAt: { gt: occupiedStartsAt },
      },
    });
    if (conflict) throw new AppError("CONFLICT", "Horario no disponible");

    await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: "RESCHEDULED",
        syncStatus: "SYNC_PENDING",
      },
    });

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return tx.booking.create({
      data: {
        bookingNumber: `RV-${stamp}-${nanoid(6).toUpperCase()}`,
        serviceId: existing.serviceId,
        locationId: existing.locationId,
        customerProfileId: existing.customerProfileId,
        startsAt,
        endsAt,
        occupiedStartsAt,
        occupiedEndsAt,
        status: "CONFIRMED",
        syncStatus: "SYNC_PENDING",
        priceCents: existing.priceCents,
        notes: existing.notes,
        rescheduledFromId: existing.id,
      },
    });
  });

  // Cancel old calendar event then sync new
  await syncBookingToCalendar(existing.id);
  await syncBookingToCalendar(newBooking.id);
  return newBooking;
}

export async function createManualBooking(input: {
  serviceId: string;
  locationId: string;
  startsAtIso: string;
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  const { createBookingWithHold } = await import(
    "@/modules/booking/application/create-booking"
  );
  const { confirmPaymentApproved } = await import(
    "@/modules/orders/application/confirm-payment"
  );

  const { booking } = await createBookingWithHold({
    ...input,
    sessionToken: `admin-${nanoid(12)}`,
  });

  await confirmPaymentApproved({
    bookingId: booking.id,
    providerPaymentId: `manual-admin-${booking.id}`,
    rawPayload: { source: "admin-manual" },
  });

  return booking;
}
