import type { Interval } from "@/modules/booking/domain/slots";
import { prisma } from "@/lib/prisma";
import { getAuthedCalendarClient } from "@/modules/calendar/infrastructure/google-client";
import { logger } from "@/lib/logger";

export async function getFreeBusy(
  timeMin: Date,
  timeMax: Date,
): Promise<Interval[]> {
  const connection = await prisma.calendarConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!connection) {
    logger.info("calendar.freebusy.skipped_no_connection");
    return [];
  }

  const calendar = await getAuthedCalendarClient(connection.id);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: connection.calendarId }],
    },
  });

  const cal = res.data.calendars?.[connection.calendarId];
  const busy = cal?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({
      start: new Date(b.start as string),
      end: new Date(b.end as string),
    }));
}
