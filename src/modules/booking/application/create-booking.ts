import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { buildOccupiedWindow, overlaps } from "@/modules/booking/domain/slots";
import { HOLD_MINUTES } from "@/modules/booking/application/availability";
import { getFreeBusy } from "@/modules/calendar/application/freebusy";

const schema = z.object({
  serviceId: z.string().min(1),
  locationId: z.string().min(1),
  startsAtIso: z.string().datetime(),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  sessionToken: z.string().min(8),
});

export type CreateBookingInput = z.infer<typeof schema>;

function bookingNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RV-${stamp}-${nanoid(6).toUpperCase()}`;
}

export async function createBookingWithHold(raw: CreateBookingInput) {
  const input = schema.parse(raw);
  const startsAt = new Date(input.startsAtIso);

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, isActive: true },
  });
  if (!service) throw new AppError("NOT_FOUND", "Servicio no encontrado");

  const location = await prisma.serviceLocation.findFirst({
    where: { id: input.locationId, isActive: true },
  });
  if (!location) throw new AppError("NOT_FOUND", "Ubicación no encontrada");

  const offering = await prisma.serviceOffering.findFirst({
    where: {
      serviceId: service.id,
      locationId: location.id,
      isActive: true,
    },
  });
  if (!offering) {
    throw new AppError("VALIDATION", "Servicio no disponible en esa modalidad");
  }

  const { endsAt, occupiedStartsAt, occupiedEndsAt } = buildOccupiedWindow({
    startsAt,
    durationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    travelBufferMinutes: location.travelBufferMinutes,
  });

  // Fresh FreeBusy check
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
    throw new AppError("CONFLICT", "Ese horario ya no está disponible en el calendario");
  }

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

  return prisma.$transaction(async (tx) => {
    await tx.bookingHold.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const conflictingBooking = await tx.booking.findFirst({
      where: {
        locationId: location.id,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        occupiedStartsAt: { lt: occupiedEndsAt },
        occupiedEndsAt: { gt: occupiedStartsAt },
      },
    });
    if (conflictingBooking) {
      throw new AppError("CONFLICT", "Ese horario acaba de ser reservado");
    }

    const conflictingHold = await tx.bookingHold.findFirst({
      where: {
        locationId: location.id,
        expiresAt: { gt: new Date() },
        startsAt: { lt: occupiedEndsAt },
        endsAt: { gt: occupiedStartsAt },
        NOT: { sessionToken: input.sessionToken },
      },
    });
    if (conflictingHold) {
      throw new AppError("CONFLICT", "Ese horario está temporalmente bloqueado");
    }

    await tx.bookingHold.create({
      data: {
        serviceId: service.id,
        locationId: location.id,
        startsAt: occupiedStartsAt,
        endsAt: occupiedEndsAt,
        expiresAt,
        sessionToken: input.sessionToken,
      },
    });

    const customer = await tx.customerProfile.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phone: input.phone,
      },
    });

    const booking = await tx.booking.create({
      data: {
        bookingNumber: bookingNumber(),
        serviceId: service.id,
        locationId: location.id,
        customerProfileId: customer.id,
        startsAt,
        endsAt,
        occupiedStartsAt,
        occupiedEndsAt,
        status: "PENDING_PAYMENT",
        syncStatus: "NONE",
        priceCents: service.priceCents,
        notes: input.notes,
      },
      include: { service: true, location: true },
    });

    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: process.env.MERCADOPAGO_ACCESS_TOKEN
          ? "MERCADO_PAGO"
          : "MANUAL",
        idempotencyKey: `booking-${booking.id}-pay`,
        status: "PENDING",
        amountCents: booking.priceCents,
      },
    });

    return { booking, payment };
  });
}
