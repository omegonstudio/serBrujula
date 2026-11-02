import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { businessTimezone } from "@/lib/timezone";
import {
  busyFromBlocks,
  generateSlotsForDay,
  localTimeToUtc,
  type Interval,
  type SlotCandidate,
} from "@/modules/booking/domain/slots";
import { getFreeBusy } from "@/modules/calendar/application/freebusy";

const HOLD_MINUTES = 10;

export async function listAvailableSlots(input: {
  serviceId: string;
  locationId: string;
  fromDate: string; // YYYY-MM-DD in business TZ
  days?: number;
}): Promise<SlotCandidate[]> {
  const days = input.days ?? 14;
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
    throw new AppError("VALIDATION", "El servicio no se ofrece en esa modalidad");
  }

  const tz = businessTimezone();
  const [y, m, d] = input.fromDate.split("-").map(Number);
  const rangeStart = localTimeToUtc(y, m, d, "00:00", tz);
  const endDate = new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000);

  const [rules, exceptions, bookings, holds, googleBusy] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { locationId: location.id } }),
    prisma.availabilityException.findMany({
      where: {
        AND: [
          { startsAt: { lt: endDate } },
          { endsAt: { gt: rangeStart } },
          { OR: [{ locationId: location.id }, { locationId: null }] },
        ],
      },
    }),
    prisma.booking.findMany({
      where: {
        locationId: location.id,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        occupiedStartsAt: { lt: endDate },
        occupiedEndsAt: { gt: rangeStart },
      },
      select: { occupiedStartsAt: true, occupiedEndsAt: true },
    }),
    prisma.bookingHold.findMany({
      where: {
        locationId: location.id,
        expiresAt: { gt: new Date() },
        startsAt: { lt: endDate },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    getFreeBusy(rangeStart, endDate).catch(() => [] as Interval[]),
  ]);

  const busy: Interval[] = [
    ...busyFromBlocks(exceptions),
    ...bookings.map((b) => ({ start: b.occupiedStartsAt, end: b.occupiedEndsAt })),
    ...holds.map((h) => ({ start: h.startsAt, end: h.endsAt })),
    ...googleBusy,
  ];

  const slots: SlotCandidate[] = [];
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
    // Recompute Y-M-D in TZ for each day
    const label = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dayStart);
    const [yy, mm, dd] = label.split("-").map(Number);
    slots.push(
      ...generateSlotsForDay({
        year: yy,
        month: mm,
        day: dd,
        rules,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        travelBufferMinutes: location.travelBufferMinutes,
        busy,
        timeZone: tz,
      }),
    );
  }

  return slots;
}

export { HOLD_MINUTES };
