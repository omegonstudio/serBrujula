import { getBusinessTimezone } from "@/lib/env";

export const BUSINESS_TIMEZONE_DEFAULT = "America/Argentina/Buenos_Aires";

export function businessTimezone(): string {
  try {
    return getBusinessTimezone();
  } catch {
    return process.env.BUSINESS_TIMEZONE ?? BUSINESS_TIMEZONE_DEFAULT;
  }
}

/** Format a UTC Date for display in the business timezone. */
export function formatInBusinessTz(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: businessTimezone(),
    ...options,
  }).format(date);
}

export function nowUtc(): Date {
  return new Date();
}
