import { BUSINESS_TIMEZONE_DEFAULT } from "@/lib/timezone";

export type LocalRule = {
  dayOfWeek: number; // 0=Sun .. 6=Sat (JS getUTCDay style for local)
  startTimeLocal: string; // HH:mm
  endTimeLocal: string;
};

export type Interval = { start: Date; end: Date };

export type SlotCandidate = {
  startsAt: Date;
  endsAt: Date;
  occupiedStartsAt: Date;
  occupiedEndsAt: Date;
};

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

/** Get Y-M-D parts of a Date in a timezone. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dayOfWeek: weekdayMap[parts.weekday ?? "Mon"] ?? 1,
  };
}

/** Convert local wall time in business TZ to UTC Date. */
export function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hm: string,
  timeZone: string = BUSINESS_TIMEZONE_DEFAULT,
): Date {
  const { h, m } = parseHm(hm);
  const guess = new Date(Date.UTC(year, month - 1, day, h, m, 0));
  const parts = zonedParts(guess, timeZone);
  const asLocalMinutes = parts.hour * 60 + parts.minute;
  const wanted = h * 60 + m;
  const deltaMin = asLocalMinutes - wanted;
  // Also correct day drift
  let dayDelta = 0;
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    const wantedDay = Date.UTC(year, month - 1, day);
    const gotDay = Date.UTC(parts.year, parts.month - 1, parts.day);
    dayDelta = (gotDay - wantedDay) / 60_000;
  }
  return new Date(guess.getTime() - (deltaMin + dayDelta) * 60_000);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function buildOccupiedWindow(input: {
  startsAt: Date;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  travelBufferMinutes?: number;
}): { endsAt: Date; occupiedStartsAt: Date; occupiedEndsAt: Date } {
  const travel = input.travelBufferMinutes ?? 0;
  const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);
  const occupiedStartsAt = new Date(
    input.startsAt.getTime() - (input.bufferBeforeMinutes + travel) * 60_000,
  );
  const occupiedEndsAt = new Date(
    endsAt.getTime() + (input.bufferAfterMinutes + travel) * 60_000,
  );
  return { endsAt, occupiedStartsAt, occupiedEndsAt };
}

export function generateSlotsForDay(input: {
  year: number;
  month: number;
  day: number;
  rules: LocalRule[];
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  travelBufferMinutes?: number;
  busy: Interval[];
  timeZone?: string;
  now?: Date;
  stepMinutes?: number;
}): SlotCandidate[] {
  const timeZone = input.timeZone ?? BUSINESS_TIMEZONE_DEFAULT;
  const step = input.stepMinutes ?? input.durationMinutes;
  const now = input.now ?? new Date();
  const noonUtc = localTimeToUtc(input.year, input.month, input.day, "12:00", timeZone);
  const dow = zonedParts(noonUtc, timeZone).dayOfWeek;
  const dayRules = input.rules.filter((r) => r.dayOfWeek === dow);
  const slots: SlotCandidate[] = [];

  for (const rule of dayRules) {
    let cursor = localTimeToUtc(
      input.year,
      input.month,
      input.day,
      rule.startTimeLocal,
      timeZone,
    );
    const windowEnd = localTimeToUtc(
      input.year,
      input.month,
      input.day,
      rule.endTimeLocal,
      timeZone,
    );

    while (true) {
      const { endsAt, occupiedStartsAt, occupiedEndsAt } = buildOccupiedWindow({
        startsAt: cursor,
        durationMinutes: input.durationMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        travelBufferMinutes: input.travelBufferMinutes,
      });

      if (endsAt > windowEnd) break;

      const occupied = { start: occupiedStartsAt, end: occupiedEndsAt };
      const conflict = input.busy.some((b) => overlaps(occupied, b));
      if (!conflict && cursor > now) {
        slots.push({
          startsAt: new Date(cursor),
          endsAt,
          occupiedStartsAt,
          occupiedEndsAt,
        });
      }

      cursor = new Date(cursor.getTime() + step * 60_000);
      if (cursor >= windowEnd) break;
    }
  }

  return slots;
}

/** Apply BLOCK exceptions by adding busy intervals; CUSTOM_OPEN adds synthetic rules externally. */
export function busyFromBlocks(
  exceptions: Array<{ type: "BLOCK" | "CUSTOM_OPEN"; startsAt: Date; endsAt: Date }>,
): Interval[] {
  return exceptions
    .filter((e) => e.type === "BLOCK")
    .map((e) => ({ start: e.startsAt, end: e.endsAt }));
}
