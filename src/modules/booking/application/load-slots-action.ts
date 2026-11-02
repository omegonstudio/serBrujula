"use server";

import { listAvailableSlots } from "@/modules/booking/application/availability";
import { formatInBusinessTz } from "@/lib/timezone";

export async function loadSlotsAction(input: {
  serviceId: string;
  locationId: string;
  fromDate: string;
}) {
  const slots = await listAvailableSlots({
    serviceId: input.serviceId,
    locationId: input.locationId,
    fromDate: input.fromDate,
    days: 14,
  });

  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    label: formatInBusinessTz(s.startsAt, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}
