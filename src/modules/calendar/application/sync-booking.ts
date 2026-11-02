import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAuthedCalendarClient } from "@/modules/calendar/infrastructure/google-client";
import { businessTimezone } from "@/lib/timezone";

export async function syncBookingToCalendar(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      location: true,
      customerProfile: true,
      calendarEvent: true,
    },
  });
  if (!booking) return;

  const connection = await prisma.calendarConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!connection) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { syncStatus: "NONE" },
    });
    logger.warn("calendar.sync.skipped_no_connection", { bookingId });
    return;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { syncStatus: "SYNC_PENDING" },
  });

  try {
    const calendar = await getAuthedCalendarClient(connection.id);
    const tz = businessTimezone();
    const title = `${booking.service.name} · ${booking.location.type}`;
    const description = [
      `Reserva ${booking.bookingNumber}`,
      `Modalidad: ${booking.location.name}`,
      `Clienta: ${booking.customerProfile.fullName}`,
      booking.customerProfile.phone
        ? `Tel: ${booking.customerProfile.phone}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (booking.status === "CANCELLED") {
      if (booking.calendarEvent) {
        await calendar.events.delete({
          calendarId: connection.calendarId,
          eventId: booking.calendarEvent.googleEventId,
        });
        await prisma.calendarEvent.delete({
          where: { id: booking.calendarEvent.id },
        });
      }
      await prisma.booking.update({
        where: { id: bookingId },
        data: { syncStatus: "SYNCED" },
      });
      return;
    }

    const body = {
      summary: title,
      description,
      start: { dateTime: booking.startsAt.toISOString(), timeZone: tz },
      end: { dateTime: booking.endsAt.toISOString(), timeZone: tz },
      extendedProperties: {
        private: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      },
    };

    if (booking.calendarEvent) {
      await calendar.events.patch({
        calendarId: connection.calendarId,
        eventId: booking.calendarEvent.googleEventId,
        requestBody: body,
      });
      await prisma.calendarEvent.update({
        where: { id: booking.calendarEvent.id },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
    } else {
      const created = await calendar.events.insert({
        calendarId: connection.calendarId,
        requestBody: body,
      });
      const googleEventId = created.data.id;
      if (!googleEventId) throw new Error("Google no devolvió event id");
      await prisma.calendarEvent.create({
        data: {
          bookingId: booking.id,
          connectionId: connection.id,
          googleEventId,
          lastSyncedAt: new Date(),
        },
      });
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { syncStatus: "SYNCED" },
    });
  } catch (error) {
    logger.error("calendar.sync.failed", { bookingId, error });
    await prisma.booking.update({
      where: { id: bookingId },
      data: { syncStatus: "SYNC_FAILED" },
    });
    if (booking.calendarEvent) {
      await prisma.calendarEvent.update({
        where: { id: booking.calendarEvent.id },
        data: {
          lastError: error instanceof Error ? error.message : "sync failed",
        },
      });
    }
  }
}
